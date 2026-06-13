ALTER TABLE settings ADD COLUMN google_account_email TEXT;
ALTER TABLE settings ADD COLUMN google_refresh_token TEXT;
ALTER TABLE settings ADD COLUMN device_id TEXT;
ALTER TABLE settings ADD COLUMN last_synced_at TEXT;
ALTER TABLE settings ADD COLUMN local_modified_at TEXT;

UPDATE settings
SET device_id = lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
WHERE id = 1 AND (device_id IS NULL OR device_id = '');

CREATE TRIGGER IF NOT EXISTS touch_local_modified_foods AFTER INSERT ON foods
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_foods_u AFTER UPDATE ON foods
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_foods_d AFTER DELETE ON foods
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_food_entries AFTER INSERT ON food_entries
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_food_entries_u AFTER UPDATE ON food_entries
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_food_entries_d AFTER DELETE ON food_entries
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_days AFTER INSERT ON days
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_days_u AFTER UPDATE ON days
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_days_d AFTER DELETE ON days
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_day_workouts AFTER INSERT ON day_workouts
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_day_workouts_u AFTER UPDATE ON day_workouts
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_day_workouts_d AFTER DELETE ON day_workouts
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_workout_templates AFTER INSERT ON workout_templates
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_workout_templates_u AFTER UPDATE ON workout_templates
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_workout_templates_d AFTER DELETE ON workout_templates
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_routines AFTER INSERT ON routines
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_routines_u AFTER UPDATE ON routines
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_routines_d AFTER DELETE ON routines
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_routine_exercises AFTER INSERT ON routine_exercises
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_routine_exercises_d AFTER DELETE ON routine_exercises
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_exercise_logs AFTER INSERT ON exercise_logs
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_exercise_logs_d AFTER DELETE ON exercise_logs
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_exercise_log_sets AFTER INSERT ON exercise_log_sets
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_exercise_log_sets_d AFTER DELETE ON exercise_log_sets
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_routine_logs AFTER INSERT ON routine_logs
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_routine_logs_d AFTER DELETE ON routine_logs
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS touch_local_modified_routine_log_entries AFTER INSERT ON routine_log_entries
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS touch_local_modified_routine_log_entries_d AFTER DELETE ON routine_log_entries
BEGIN UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1; END;
