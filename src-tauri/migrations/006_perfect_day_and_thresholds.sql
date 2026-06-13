PRAGMA foreign_keys = OFF;

CREATE TABLE days_new (
    date TEXT PRIMARY KEY,
    weight REAL,
    walking_primary TEXT CHECK (walking_primary IN ('steps', 'distance_km', 'duration_min')),
    steps INTEGER,
    distance_km REAL,
    duration_min REAL,
    worked_out INTEGER NOT NULL DEFAULT 0,
    workout_duration_min INTEGER,
    workout_intensity TEXT CHECK (workout_intensity IN ('low', 'medium', 'high')),
    notes TEXT,
    daily_score TEXT CHECK (daily_score IN ('good', 'okay', 'bad', 'perfect')),
    total_calories REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO days_new SELECT * FROM days;
DROP TABLE days;
ALTER TABLE days_new RENAME TO days;
CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);

UPDATE settings SET score_okay_threshold = 25
WHERE id = 1 AND score_okay_threshold = 45;

PRAGMA foreign_keys = ON;
