import sqlite3
import uuid
from datetime import date

DB_NAME = "agenda.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row  # para que podamos acceder por nombre de columna
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                context TEXT,
                priority INTEGER DEFAULT 2,
                pomodoros INTEGER DEFAULT 1,
                pomodoros_done INTEGER DEFAULT 0,
                target_hour TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                done_at DATETIME,
                date TEXT NOT NULL,
                position INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                score INTEGER,
                notes TEXT,
                tasks_done INTEGER,
                tasks_total INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_prefs (
                key TEXT PRIMARY KEY,
                value REAL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS task_patterns (
                task_id             TEXT PRIMARY KEY,
                date                TEXT NOT NULL,
                target_hour         TEXT,
                estimated_pomodoros INTEGER NOT NULL DEFAULT 1,
                actual_pomodoros    INTEGER NOT NULL DEFAULT 1,
                was_completed       INTEGER NOT NULL DEFAULT 0,
                recorded_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            );
            CREATE INDEX IF NOT EXISTS idx_task_patterns_date ON task_patterns(date);
        """)

# Llamar a init_db al importar este módulo por primera vez
init_db()