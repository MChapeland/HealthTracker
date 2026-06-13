CREATE TABLE IF NOT EXISTS day_workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_date TEXT NOT NULL REFERENCES days(date) ON DELETE CASCADE,
    duration_min INTEGER NOT NULL,
    intensity TEXT NOT NULL DEFAULT 'medium' CHECK (intensity IN ('low', 'medium', 'high')),
    calories REAL,
    calories_override INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_day_workouts_day ON day_workouts(day_date);

INSERT INTO day_workouts (day_date, duration_min, intensity, calories, calories_override, sort_order)
SELECT date,
       workout_duration_min,
       COALESCE(workout_intensity, 'medium'),
       workout_calories,
       COALESCE(workout_calories_override, 0),
       0
FROM days
WHERE workout_duration_min IS NOT NULL
  AND workout_duration_min > 0;
