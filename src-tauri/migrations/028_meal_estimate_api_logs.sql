CREATE TABLE IF NOT EXISTS meal_estimate_api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_kind TEXT NOT NULL,
    request_prompt TEXT NOT NULL,
    response_text TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    http_status INTEGER,
    prompt_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd REAL,
    duration_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meal_estimate_api_logs_created_at
    ON meal_estimate_api_logs (created_at DESC);
