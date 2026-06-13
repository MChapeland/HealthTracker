ALTER TABLE settings ADD COLUMN calorie_warning_below INTEGER NOT NULL DEFAULT 1000;
UPDATE settings
SET calorie_warning_below = MAX(0, calorie_ideal_min - 200)
WHERE id = 1;
