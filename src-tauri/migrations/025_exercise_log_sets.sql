CREATE TABLE IF NOT EXISTS exercise_log_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_log_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    amount REAL NOT NULL,
    weight_kg REAL
);

INSERT INTO exercise_log_sets (exercise_log_id, sort_order, amount, weight_kg)
SELECT id, 0, amount, weight_kg FROM exercise_logs;

CREATE TABLE exercise_logs_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    day_date TEXT NOT NULL,
    calories REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO exercise_logs_new (id, exercise_id, day_date, calories, created_at)
SELECT id, exercise_id, day_date, calories, created_at FROM exercise_logs;

CREATE TABLE _exercise_sets_backup (
    exercise_log_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    amount REAL NOT NULL,
    weight_kg REAL
);

INSERT INTO _exercise_sets_backup (exercise_log_id, sort_order, amount, weight_kg)
SELECT exercise_log_id, sort_order, amount, weight_kg FROM exercise_log_sets;

DROP TABLE exercise_log_sets;
DROP TABLE exercise_logs;

ALTER TABLE exercise_logs_new RENAME TO exercise_logs;

CREATE TABLE exercise_log_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_log_id INTEGER NOT NULL REFERENCES exercise_logs(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    amount REAL NOT NULL,
    weight_kg REAL
);

INSERT INTO exercise_log_sets (exercise_log_id, sort_order, amount, weight_kg)
SELECT exercise_log_id, sort_order, amount, weight_kg FROM _exercise_sets_backup;

DROP TABLE _exercise_sets_backup;

CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(exercise_id, day_date);
CREATE INDEX IF NOT EXISTS idx_exercise_log_sets_log ON exercise_log_sets(exercise_log_id);
