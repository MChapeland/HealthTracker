ALTER TABLE days ADD COLUMN workout_calories REAL;
ALTER TABLE days ADD COLUMN workout_calories_override INTEGER NOT NULL DEFAULT 0;
