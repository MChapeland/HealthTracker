ALTER TABLE settings ADD COLUMN meal_estimate_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN meal_estimate_api_key TEXT;
ALTER TABLE settings ADD COLUMN meal_estimate_model TEXT NOT NULL DEFAULT 'gemini-2.0-flash';

CREATE TABLE IF NOT EXISTS meal_estimate_cache (
    normalized_key TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
