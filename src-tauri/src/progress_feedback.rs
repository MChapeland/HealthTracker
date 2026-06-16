use crate::gemini::{call_gemini_json, extract_json_blob, GeminiCallResult};
use crate::meal_estimate;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressFeedbackRequest {
    pub topic: String,
    pub user_note: Option<String>,
    pub analysis_period_days: i64,
    pub generated_at: String,
    pub user_context: Value,
    pub computed: ComputedBlock,
    pub recent_logs: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputedBlock {
    pub local_status: String,
    pub local_status_reason: String,
    pub confidence: String,
    pub confidence_reason: String,
    pub metrics: Value,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressFeedbackResponse {
    pub headline: String,
    pub status: String,
    pub summary: String,
    pub likely_explanation: String,
    pub positive_signals: Vec<String>,
    pub watch_outs: Vec<String>,
    pub next_steps: Vec<String>,
    pub confidence: String,
    pub confidence_reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub debug_payload: Option<ProgressFeedbackRequest>,
}

const SYSTEM_PROMPT: &str = "You are a supportive health and habit coach for a personal tracking app. \
Use cautious language (may, likely, suggests). Focus on trends over single days. \
Treat the computed metrics block as authoritative — do not recalculate numbers. \
Do not provide medical diagnosis. Do not encourage extreme dieting, fasting, purging, dehydration, or excessive exercise. \
Do not claim muscle gain or water retention with certainty. Max 3 next steps. \
If status is recentlyIncreasedTrainingLoad, you may mention fatigue or recovery gently — never imply injury or medical risk. \
Defer medical questions to healthcare professionals.";

fn topic_fragment(topic: &str) -> &'static str {
    match topic {
        "weightTrend" => "Focus on weight trend, plateaus, and scale fluctuations using computed averages.",
        "nutrition" => "Focus on calorie consistency vs goal bands. Do not recommend extreme restriction.",
        "activity" => "Focus on step trends and inactive patterns.",
        "workouts" => "Focus on workout consistency. If recentlyIncreasedTrainingLoad, discuss pacing carefully.",
        "hydration" => "Focus on water logging consistency and goals.",
        "dentalHabits" => "Encourage brushing habits without guilt.",
        "consistency" => "Focus on logging consistency across domains. Do not shame missed days.",
        "custom" => "Answer the user's specific question within wellness coaching scope.",
        _ => "Summarize cross-domain trends and suggest one focus for next week.",
    }
}

fn build_prompt(request: &ProgressFeedbackRequest) -> String {
    let payload = serde_json::to_string_pretty(request).unwrap_or_default();
    format!(
        "{SYSTEM_PROMPT}\n\nTopic focus: {}\n\nReturn ONLY JSON with this schema:\n\
         {{\"headline\": string, \"status\": string, \"summary\": string, \"likelyExplanation\": string, \
         \"positiveSignals\": string[1-3], \"watchOuts\": string[0-3], \"nextSteps\": string[1-3], \
         \"confidence\": \"high\"|\"medium\"|\"low\", \"confidenceReason\": string}}\n\n\
         User note: {}\n\nComputed payload (source of truth):\n{payload}",
        topic_fragment(&request.topic),
        request.user_note.as_deref().unwrap_or("(none)"),
    )
}

fn pick_string(obj: &serde_json::Map<String, Value>, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(Value::String(s)) = obj.get(*key) {
            let trimmed = s.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

fn pick_string_array(obj: &serde_json::Map<String, Value>, keys: &[&str]) -> Vec<String> {
    for key in keys {
        if let Some(Value::Array(items)) = obj.get(*key) {
            return items
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
                .take(3)
                .collect();
        }
    }
    vec![]
}

pub fn parse_feedback_response(text: &str) -> Result<ProgressFeedbackResponse, String> {
    let blob = extract_json_blob(text);
    let value: Value =
        serde_json::from_str(&blob).map_err(|_| "Could not parse AI feedback response".to_string())?;
    let obj = value
        .as_object()
        .ok_or_else(|| "Could not parse AI feedback response".to_string())?;

    let headline = pick_string(obj, &["headline"]).ok_or_else(|| {
        "AI response missing headline".to_string()
    })?;
    let status = pick_string(obj, &["status"]).unwrap_or_else(|| "Update".to_string());
    let summary = pick_string(obj, &["summary"]).ok_or_else(|| {
        "AI response missing summary".to_string()
    })?;
    let likely_explanation = pick_string(obj, &["likelyExplanation", "likely_explanation"])
        .unwrap_or_default();
    let positive_signals = pick_string_array(obj, &["positiveSignals", "positive_signals"]);
    let watch_outs = pick_string_array(obj, &["watchOuts", "watch_outs"]);
    let next_steps = pick_string_array(obj, &["nextSteps", "next_steps"]);
    let confidence = pick_string(obj, &["confidence"]).unwrap_or_else(|| "medium".to_string());
    let confidence_reason = pick_string(obj, &["confidenceReason", "confidence_reason"])
        .unwrap_or_default();

    if positive_signals.is_empty() || next_steps.is_empty() {
        return Err("AI response missing required sections".to_string());
    }

    Ok(ProgressFeedbackResponse {
        headline,
        status,
        summary,
        likely_explanation,
        positive_signals,
        watch_outs,
        next_steps,
        confidence,
        confidence_reason,
        debug_payload: None,
    })
}

pub fn insert_ai_api_log(
    db: &Connection,
    feature: &str,
    topic: Option<&str>,
    model: &str,
    status: &str,
    error_code: Option<&str>,
    duration_ms: i64,
    http_status: Option<i64>,
    prompt_tokens: Option<i64>,
    output_tokens: Option<i64>,
    total_tokens: Option<i64>,
    estimated_cost_usd: Option<f64>,
    request_prompt: Option<&str>,
    response_text: Option<&str>,
) -> Result<(), String> {
    db.execute(
        "INSERT INTO ai_api_logs (
            feature, topic, model, status, error_code, duration_ms, http_status,
            prompt_tokens, output_tokens, total_tokens, estimated_cost_usd,
            request_prompt, response_text
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            feature,
            topic,
            model,
            status,
            error_code,
            duration_ms,
            http_status,
            prompt_tokens,
            output_tokens,
            total_tokens,
            estimated_cost_usd,
            request_prompt,
            response_text,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn generate_feedback(
    api_key: &str,
    model: &str,
    request: ProgressFeedbackRequest,
) -> Result<(ProgressFeedbackResponse, GeminiCallResult, String), String> {
    let prompt = build_prompt(&request);
    let call = call_gemini_json(api_key, model, &prompt).await?;
    let mut parsed = parse_feedback_response(&call.response_text)?;
    parsed.debug_payload = Some(request);
    Ok((parsed, call, prompt))
}

pub fn log_feedback_call(
    db: &Connection,
    topic: &str,
    model: &str,
    verbose_logging: bool,
    prompt: &str,
    call: &GeminiCallResult,
    error: Option<&str>,
) -> Result<(), String> {
    let status = if error.is_some() { "error" } else { "success" };
    let cost = if error.is_none() {
        meal_estimate::estimate_cost_usd_public(model, call.prompt_tokens, call.output_tokens)
    } else {
        None
    };
    insert_ai_api_log(
        db,
        "progress_feedback",
        Some(topic),
        model,
        status,
        error.map(|_| "gemini_error"),
        call.duration_ms,
        Some(call.http_status),
        call.prompt_tokens,
        call.output_tokens,
        call.total_tokens,
        cost,
        if verbose_logging { Some(prompt) } else { None },
        if verbose_logging && error.is_none() {
            Some(call.response_text.as_str())
        } else {
            None
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_feedback_json() {
        let text = r#"{"headline":"Steady progress","status":"On track","summary":"Good job","likelyExplanation":"Trend is fine","positiveSignals":["Logging"],"watchOuts":[],"nextSteps":["Keep going"],"confidence":"high","confidenceReason":"Enough data"}"#;
        let parsed = parse_feedback_response(text).unwrap();
        assert_eq!(parsed.headline, "Steady progress");
        assert_eq!(parsed.positive_signals.len(), 1);
    }

    #[test]
    fn parse_rejects_missing_headline() {
        let text = r#"{"summary":"x","positiveSignals":["a"],"nextSteps":["b"],"confidence":"low","confidenceReason":"c"}"#;
        assert!(parse_feedback_response(text).is_err());
    }
}
