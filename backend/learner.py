from database import get_db

DEFAULT_WEIGHTS = {
    "morning_weight": 1.0,
    "priority_weight": 1.0,
    "pomodoro_accuracy": 1.0,
    "preferred_start_hour": 9.0,
}


def get_planner_weights() -> dict:
    with get_db() as conn:
        result = dict(DEFAULT_WEIGHTS)
        for key in DEFAULT_WEIGHTS:
            result[key] = _get_weight(key, conn)
        return result


def record_task_outcome(task_id: str, was_completed: bool, actual_pomodoros: int) -> None:
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT target_hour, pomodoros, date FROM tasks WHERE id = ?", (task_id,)
        )
        row = cursor.fetchone()
        if not row:
            return
        conn.execute("""
            INSERT OR REPLACE INTO task_patterns
                (task_id, date, target_hour, estimated_pomodoros, actual_pomodoros, was_completed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (task_id, row["date"], row["target_hour"],
              row["pomodoros"], actual_pomodoros, 1 if was_completed else 0))
        conn.commit()


def process_feedback(date: str, score: int, notes: str | None) -> dict:
    changes = {}
    with get_db() as conn:
        for fn, key in [
            (_analyze_morning_completion, "morning_weight"),
            (_analyze_pomodoro_accuracy, "pomodoro_accuracy"),
            (_analyze_priority_discipline, "priority_weight"),
        ]:
            delta = fn(date, conn)
            if delta is not None:
                old = _get_weight(key, conn)
                new = max(0.5, min(2.0, old + delta))
                _upsert_weight(key, new, conn)
                changes[key] = {"old": old, "new": new}

        if score < 3:
            cursor = conn.execute("""
                SELECT target_hour FROM task_patterns
                WHERE date = ? AND was_completed = 1
                ORDER BY target_hour ASC LIMIT 1
            """, (date,))
            row = cursor.fetchone()
            if row and row["target_hour"]:
                first_hour = int(row["target_hour"].split(":")[0])
                current = int(_get_weight("preferred_start_hour", conn))
                if first_hour > current + 1:
                    new = max(6.0, current - 0.5)
                    _upsert_weight("preferred_start_hour", new, conn)
                    changes["preferred_start_hour"] = {"old": current, "new": new}

        conn.commit()
    return {"date": date, "score": score, "weight_changes": changes}


# --- Heurísticas privadas ---

def _analyze_morning_completion(date, conn):
    cur = conn.execute("""
        SELECT
            SUM(CASE WHEN target_hour < '12:00' AND was_completed=1 THEN 1 ELSE 0 END) m_done,
            SUM(CASE WHEN target_hour < '12:00' THEN 1 ELSE 0 END) m_total,
            SUM(CASE WHEN target_hour >= '12:00' AND was_completed=1 THEN 1 ELSE 0 END) a_done,
            SUM(CASE WHEN target_hour >= '12:00' THEN 1 ELSE 0 END) a_total
        FROM task_patterns WHERE date=?
    """, (date,))
    r = cur.fetchone()
    if not r or not r["m_total"] or r["m_total"] < 2 or not r["a_total"] or r["a_total"] < 2:
        return None
    diff = (r["m_done"] / r["m_total"]) - (r["a_done"] / r["a_total"])
    if diff > 0.2:
        return +0.05
    if diff < -0.2:
        return -0.05
    return None


def _analyze_pomodoro_accuracy(date, conn):
    cur = conn.execute("""
        SELECT AVG(CAST(actual_pomodoros AS REAL) / estimated_pomodoros) ratio
        FROM task_patterns WHERE date=? AND was_completed=1 AND estimated_pomodoros>0
    """, (date,))
    r = cur.fetchone()
    if not r or r["ratio"] is None:
        return None
    if r["ratio"] > 1.2:
        return +0.05
    if r["ratio"] < 0.8:
        return -0.05
    return None


def _analyze_priority_discipline(date, conn):
    # Urgentes que quedaron pendientes (no aparecen en task_patterns)
    cur = conn.execute("""
        SELECT COUNT(*) p1_skip FROM tasks
        WHERE date=? AND priority=1 AND status != 'done'
    """, (date,))
    p1_skip = cur.fetchone()["p1_skip"]

    # Opcionales completadas (sí aparecen en task_patterns)
    cur = conn.execute("""
        SELECT COUNT(*) p3_done FROM task_patterns tp
        JOIN tasks t ON t.id=tp.task_id
        WHERE tp.date=? AND t.priority=3 AND tp.was_completed=1
    """, (date,))
    p3_done = cur.fetchone()["p3_done"]

    if p1_skip > 0 and p3_done > 0:
        return +0.1
    return None


def _get_weight(key: str, conn) -> float:
    cur = conn.execute("SELECT value FROM user_prefs WHERE key=?", (key,))
    row = cur.fetchone()
    return row["value"] if row else DEFAULT_WEIGHTS.get(key, 1.0)


def _upsert_weight(key: str, value: float, conn) -> None:
    conn.execute("""
        INSERT INTO user_prefs (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
    """, (key, value))
