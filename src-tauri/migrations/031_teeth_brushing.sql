ALTER TABLE settings ADD COLUMN daily_teeth_brushings_goal INTEGER NOT NULL DEFAULT 2;
ALTER TABLE settings ADD COLUMN score_weight_teeth INTEGER NOT NULL DEFAULT 10;
ALTER TABLE days ADD COLUMN teeth_brushings INTEGER;
