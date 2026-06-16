ALTER TABLE settings ADD COLUMN ai_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN ai_api_key TEXT;
ALTER TABLE settings ADD COLUMN ai_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash';
ALTER TABLE settings ADD COLUMN ai_feedback_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN ai_verbose_logging INTEGER NOT NULL DEFAULT 0;

UPDATE settings
SET
    ai_api_key = meal_estimate_api_key,
    ai_model = COALESCE(NULLIF(meal_estimate_model, ''), 'gemini-2.5-flash'),
    ai_enabled = meal_estimate_enabled,
    ai_feedback_enabled = 0,
    ai_verbose_logging = 0
WHERE id = 1;
