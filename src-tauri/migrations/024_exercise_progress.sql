CREATE TABLE IF NOT EXISTS exercise_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    day_date TEXT NOT NULL,
    amount REAL NOT NULL,
    amount_unit TEXT NOT NULL,
    calories REAL,
    weight_kg REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS routine_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    day_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS routine_log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_log_id INTEGER NOT NULL REFERENCES routine_logs(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    amount_unit TEXT NOT NULL,
    calories REAL,
    weight_kg REAL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(exercise_id, day_date);
CREATE INDEX IF NOT EXISTS idx_routine_logs_routine ON routine_logs(routine_id, day_date);
