ALTER TABLE settings ADD COLUMN birth_date TEXT;
UPDATE settings
SET birth_date = date('now', '-' || age_years || ' years')
WHERE age_years IS NOT NULL AND birth_date IS NULL;
