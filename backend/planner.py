POMODORO_MIN = 25
GAP_MIN = 5
DAY_END = 21 * 60


def generate_agenda(tasks: list[dict], date: str, weights: dict | None = None) -> list[dict]:
    from learner import get_planner_weights
    if weights is None:
        weights = get_planner_weights()

    pomo_acc = weights.get("pomodoro_accuracy", 1.0)
    start_h  = int(weights.get("preferred_start_hour", 9))

    anchored = [t for t in tasks if t.get("target_hour")]
    free     = [t for t in tasks if not t.get("target_hour")]

    for t in free:
        t["_score"] = (4 - t["priority"]) * weights.get("priority_weight", 1.0) \
                    + weights.get("morning_weight", 1.0)

    free_sorted = sorted(free, key=lambda t: t["_score"], reverse=True)
    planned = _assign_blocks(anchored, free_sorted, start_h, pomo_acc)

    for t in planned:
        t.pop("_score", None)

    return planned


def _assign_blocks(anchored, free_sorted, start_h, pomo_acc):
    occupied = sorted([
        {
            "start": _to_min(t["target_hour"]),
            "end": _to_min(t["target_hour"]) + int(t["pomodoros"] * POMODORO_MIN * pomo_acc),
            "task": t,
        }
        for t in anchored
    ], key=lambda s: s["start"])

    cursor = start_h * 60
    gaps = []
    for slot in occupied:
        if cursor < slot["start"]:
            gaps.append({"start": cursor, "end": slot["start"]})
        cursor = slot["end"] + GAP_MIN
    if cursor < DAY_END:
        gaps.append({"start": cursor, "end": DAY_END})

    result = [s["task"] | {"suggested_start": _to_hhmm(s["start"])} for s in occupied]

    gi = 0
    gc = gaps[0]["start"] if gaps else None

    for task in free_sorted:
        if gc is None:
            result.append(task | {"suggested_start": None})
            continue

        dur = int(task["pomodoros"] * POMODORO_MIN * pomo_acc)
        placed = False

        while gi < len(gaps):
            if gaps[gi]["end"] - gc >= dur:
                result.append(task | {"suggested_start": _to_hhmm(gc)})
                gc += dur + GAP_MIN
                placed = True
                break
            gi += 1
            if gi < len(gaps):
                gc = gaps[gi]["start"]
            else:
                gc = None
                break

        if not placed:
            result.append(task | {"suggested_start": None})

    timed   = sorted([t for t in result if t.get("suggested_start")],
                     key=lambda t: t["suggested_start"])
    untimed = [t for t in result if not t.get("suggested_start")]
    return timed + untimed


def _to_min(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def _to_hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"
