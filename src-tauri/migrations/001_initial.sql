CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    starting_weight REAL,
    target_weight REAL,
    step_length_m REAL NOT NULL DEFAULT 0.75,
    speed_kmh REAL NOT NULL DEFAULT 4.5,
    steps_per_km REAL,
    daily_steps_goal INTEGER NOT NULL DEFAULT 8000,
    calorie_ideal_min INTEGER NOT NULL DEFAULT 1200,
    calorie_ideal_max INTEGER NOT NULL DEFAULT 1500,
    calorie_warning INTEGER NOT NULL DEFAULT 1500,
    calorie_max INTEGER NOT NULL DEFAULT 2000,
    score_weight_calories INTEGER NOT NULL DEFAULT 70,
    score_weight_walking INTEGER NOT NULL DEFAULT 20,
    score_weight_workout INTEGER NOT NULL DEFAULT 10,
    score_weight_trend INTEGER NOT NULL DEFAULT 0,
    score_good_threshold INTEGER NOT NULL DEFAULT 75,
    score_okay_threshold INTEGER NOT NULL DEFAULT 25,
    onboarding_complete INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    reference_quantity REAL NOT NULL,
    reference_unit TEXT NOT NULL CHECK (reference_unit IN ('g', 'serving')),
    calories REAL NOT NULL,
    protein REAL,
    carbs REAL,
    fat REAL,
    fiber REAL,
    micronutrients TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS days (
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

CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);

CREATE TABLE IF NOT EXISTS food_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_date TEXT NOT NULL REFERENCES days(date) ON DELETE CASCADE,
    food_id INTEGER NOT NULL REFERENCES foods(id),
    quantity REAL NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('g', 'serving')),
    calories REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_food_entries_day ON food_entries(day_date);
