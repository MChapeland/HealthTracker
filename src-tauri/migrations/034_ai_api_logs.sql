CREATE TABLE IF NOT EXISTS ai_api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    feature TEXT NOT NULL,
    topic TEXT,
    model TEXT NOT NULL,
    status TEXT NOT NULL,
    error_code TEXT,
    duration_ms INTEGER NOT NULL,
    http_status INTEGER,
    prompt_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd REAL,
    request_prompt TEXT,
    response_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_api_logs_created_at
    ON ai_api_logs (created_at DESC);
