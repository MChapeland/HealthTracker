ALTER TABLE settings ADD COLUMN macro_goal_carbs REAL;
ALTER TABLE settings ADD COLUMN macro_goal_fat REAL;
ALTER TABLE settings ADD COLUMN macro_goal_protein REAL;
ALTER TABLE settings ADD COLUMN macro_goal_fiber REAL;
ALTER TABLE settings ADD COLUMN macro_goal_salt REAL;

ALTER TABLE days ADD COLUMN total_carbs REAL;
ALTER TABLE days ADD COLUMN total_fat REAL;
ALTER TABLE days ADD COLUMN total_protein REAL;
ALTER TABLE days ADD COLUMN total_fiber REAL;
ALTER TABLE days ADD COLUMN total_salt REAL;
