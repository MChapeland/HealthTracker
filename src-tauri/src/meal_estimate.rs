use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MealEstimate {
    pub name: String,
    pub calories: f64,
    pub protein: Option<f64>,
    pub carbs: Option<f64>,
    pub fat: Option<f64>,
    pub fiber: Option<f64>,
    pub salt: Option<f64>,
    pub confidence: String,
    pub notes: String,
}

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    generation_config: GeminiGenerationConfig,
}

#[derive(Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
struct GeminiPart {
    text: String,
}

#[derive(Serialize)]
struct GeminiGenerationConfig {
    #[serde(rename = "responseMimeType")]
    response_mime_type: String,
}

#[derive(Deserialize)]
struct GeminiUsageMetadata {
    #[serde(rename = "promptTokenCount")]
    prompt_token_count: Option<i64>,
    #[serde(rename = "candidatesTokenCount")]
    candidates_token_count: Option<i64>,
    #[serde(rename = "totalTokenCount")]
    total_token_count: Option<i64>,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
    error: Option<GeminiError>,
    #[serde(rename = "usageMetadata")]
    usage_metadata: Option<GeminiUsageMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiCallLog {
    pub description: String,
    pub model: String,
    pub prompt_kind: String,
    pub request_prompt: String,
    pub response_text: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub http_status: Option<i64>,
    pub prompt_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub total_tokens: Option<i64>,
    pub estimated_cost_usd: Option<f64>,
    pub duration_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MealEstimateApiLog {
    pub id: i64,
    pub created_at: String,
    pub description: String,
    pub model: String,
    pub prompt_kind: String,
    pub request_prompt: String,
    pub response_text: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub http_status: Option<i64>,
    pub prompt_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub total_tokens: Option<i64>,
    pub estimated_cost_usd: Option<f64>,
    pub duration_ms: i64,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiCandidateContent>,
}

#[derive(Deserialize)]
struct GeminiCandidateContent {
    parts: Option<Vec<GeminiResponsePart>>,
}

#[derive(Deserialize)]
struct GeminiResponsePart {
    text: Option<String>,
}

#[derive(Deserialize)]
struct GeminiError {
    message: Option<String>,
    code: Option<i64>,
    #[allow(dead_code)]
    status: Option<String>,
}

#[derive(Deserialize)]
struct GoogleApiErrorBody {
    error: GeminiError,
}

pub const DEFAULT_GEMINI_MODEL: &str = "gemini-2.5-flash";

pub const INVALID_MEAL_DESCRIPTION: &str = "invalid_meal_description";

pub const GEMINI_MODELS: &[&str] = &[
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
];

const FALLBACK_GEMINI_MODELS: &[&str] = &["gemini-2.5-flash", "gemini-2.5-flash-lite"];

pub fn normalize_meal_estimate_model(model: &str) -> String {
    let trimmed = model.trim();
    if trimmed.is_empty() {
        return DEFAULT_GEMINI_MODEL.to_string();
    }
    if GEMINI_MODELS.iter().any(|m| *m == trimmed) {
        return trimmed.to_string();
    }
    DEFAULT_GEMINI_MODEL.to_string()
}

pub fn normalize_description(description: &str) -> String {
    description
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c.is_whitespace() {
                c
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn build_prompt(description: &str) -> String {
    format!(
        "You are a nutrition estimator. The user ate a meal they cannot precisely measure.\n\
         Decompose the meal into main dish, sides, and drinks if applicable.\n\
         Assume typical US restaurant portions unless the description specifies otherwise.\n\
         Round calories to the nearest 5 kcal and macros to whole grams.\n\n\
         CONFIDENCE RULES (follow strictly):\n\
         - \"high\": The description clearly names recognizable food(s). You can estimate calories and macros with modest portion assumptions.\n\
         - \"medium\": The description identifies a plausible meal, but portions, ingredients, or preparation are somewhat uncertain.\n\
         - \"low\": The description is NOT suitable for estimation — for example not food-related, gibberish, too vague, a single unclear word, or no identifiable food items. \
         Do NOT guess calories or macros when confidence is \"low\".\n\n\
         If confidence is \"low\", return ONLY this JSON (set error, do not invent nutrition numbers):\n\
         {{\"error\": \"insufficient_detail\", \"name\": \"\", \"calories\": 0, \"protein\": null, \
         \"carbs\": null, \"fat\": null, \"fiber\": null, \"salt\": null, \"confidence\": \"low\", \
         \"notes\": string}}\n\n\
         Otherwise return ONLY this JSON with confidence \"medium\" or \"high\":\n\
         {{\"name\": string, \"calories\": number, \"protein\": number|null, \"carbs\": number|null, \
         \"fat\": number|null, \"fiber\": number|null, \"salt\": number|null, \
         \"confidence\": \"medium\"|\"high\", \"notes\": string}}\n\
         Use grams for protein, carbs, fat, fiber, and salt. Notes should briefly explain portion assumptions.\n\
         Meal description: {description}"
    )
}

fn normalize_confidence(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "low" => "low".to_string(),
        "high" => "high".to_string(),
        _ => "medium".to_string(),
    }
}

fn truncate_for_name(description: &str, max: usize) -> String {
    let chars: Vec<char> = description.trim().chars().collect();
    if chars.len() <= max {
        description.trim().to_string()
    } else {
        format!("{}…", chars[..max.saturating_sub(1)].iter().collect::<String>())
    }
}

fn extract_json_blob(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.starts_with("```") {
        let inner = trimmed
            .strip_prefix("```json")
            .or_else(|| trimmed.strip_prefix("```JSON"))
            .or_else(|| trimmed.strip_prefix("```"))
            .unwrap_or(trimmed);
        if let Some(end) = inner.rfind("```") {
            return inner[..end].trim().to_string();
        }
    }
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            return trimmed[start..=end].to_string();
        }
    }
    trimmed.to_string()
}

fn value_as_f64(value: &Value) -> Option<f64> {
    match value {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().replace(',', "").parse().ok(),
        _ => None,
    }
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

fn pick_number(obj: &serde_json::Map<String, Value>, keys: &[&str]) -> Option<f64> {
    for key in keys {
        if let Some(value) = obj.get(*key) {
            if let Some(number) = value_as_f64(value) {
                return Some(number);
            }
        }
    }
    None
}

fn sanitize_macro(value: Option<f64>) -> Option<f64> {
    match value {
        Some(v) if v.is_finite() && v >= 0.0 && v <= 500.0 => Some(v),
        _ => None,
    }
}

fn coerce_estimate(mut estimate: MealEstimate, description: &str) -> MealEstimate {
    estimate.name = estimate.name.trim().to_string();
    if estimate.name.is_empty() {
        estimate.name = truncate_for_name(description, 80);
    }

    if !estimate.calories.is_finite() || estimate.calories <= 0.0 {
        estimate.calories = 500.0;
        estimate.confidence = "low".to_string();
        if estimate.notes.is_empty() {
            estimate.notes =
                "Calorie total was missing from the AI response; a rough default was applied."
                    .to_string();
        }
    } else {
        estimate.calories = estimate.calories.clamp(50.0, 5000.0);
    }

    estimate.protein = sanitize_macro(estimate.protein);
    estimate.carbs = sanitize_macro(estimate.carbs);
    estimate.fat = sanitize_macro(estimate.fat);
    estimate.fiber = sanitize_macro(estimate.fiber);
    estimate.salt = sanitize_macro(estimate.salt);
    estimate.confidence = normalize_confidence(&estimate.confidence);
    estimate.notes = estimate.notes.trim().to_string();
    estimate
}

fn meal_description_rejection(obj: &serde_json::Map<String, Value>) -> Option<String> {
    if let Some(Value::String(code)) = obj.get("error") {
        if !code.trim().is_empty() {
            return Some(INVALID_MEAL_DESCRIPTION.to_string());
        }
    }
    if obj.get("valid").and_then(|v| v.as_bool()) == Some(false) {
        return Some(INVALID_MEAL_DESCRIPTION.to_string());
    }
    None
}

fn estimate_is_unacceptable(estimate: &MealEstimate) -> bool {
    estimate.confidence == "low"
}

fn estimate_from_value(value: &Value, description: &str) -> Result<MealEstimate, String> {
    let obj = value
        .as_object()
        .ok_or_else(|| "expected json object".to_string())?;

    if let Some(message) = meal_description_rejection(obj) {
        return Err(message);
    }

    let notes =
        pick_string(obj, &["notes", "note", "assumptions", "reasoning"]).unwrap_or_default();
    let confidence =
        pick_string(obj, &["confidence", "certainty"]).unwrap_or_else(|| "medium".to_string());

    let estimate = MealEstimate {
        name: pick_string(obj, &["name", "meal", "title", "food", "mealName"])
            .unwrap_or_else(|| truncate_for_name(description, 80)),
        calories: pick_number(
            obj,
            &[
                "calories",
                "kcal",
                "caloriesKcal",
                "calories_kcal",
                "energyKcal",
                "energy_kcal",
            ],
        )
        .unwrap_or(0.0),
        protein: pick_number(obj, &["protein", "proteinG", "protein_g", "proteinGrams"]),
        carbs: pick_number(obj, &["carbs", "carbohydrates", "carbsG", "carbs_g", "carbohydratesG"]),
        fat: pick_number(obj, &["fat", "fatG", "fat_g", "totalFat", "total_fat"]),
        fiber: pick_number(obj, &["fiber", "fiberG", "fiber_g"]),
        salt: pick_number(obj, &["salt", "saltG", "salt_g", "sodiumG", "sodium_g"]),
        confidence,
        notes,
    };

    let estimate = coerce_estimate(estimate, description);
    if estimate_is_unacceptable(&estimate) {
        return Err(INVALID_MEAL_DESCRIPTION.to_string());
    }

    Ok(estimate)
}

fn parse_estimate_from_text(text: &str, description: &str) -> Result<MealEstimate, String> {
    let json_str = extract_json_blob(text);
    let value: Value =
        serde_json::from_str(&json_str).map_err(|e| format!("json parse failed: {e}"))?;
    estimate_from_value(&value, description)
}

fn build_repair_prompt(bad_response: &str, description: &str) -> String {
    format!(
        "Return ONLY one JSON object for this meal nutrition estimate.\n\
         CONFIDENCE RULES: use \"low\" only when the description is not food-related, gibberish, too vague, or has no identifiable food — in that case return \
         {{\"error\":\"insufficient_detail\",\"name\":\"\",\"calories\":0,\"protein\":null,\"carbs\":null,\"fat\":null,\"fiber\":null,\"salt\":null,\"confidence\":\"low\",\"notes\":string}}. \
         Otherwise use \"medium\" or \"high\" and include name, calories, protein, carbs, fat, fiber, salt, confidence, notes.\n\
         Numbers must be numeric (not strings).\n\
         Meal description: {description}\n\
         Previous invalid response to fix:\n{bad_response}"
    )
}

pub fn read_cache(db: &Connection, normalized_key: &str) -> Result<Option<MealEstimate>, String> {
    let result: Option<(String, String)> = db
        .query_row(
            "SELECT description, result_json FROM meal_estimate_cache WHERE normalized_key = ?1",
            [normalized_key],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    match result {
        Some((description, json)) => match parse_estimate_from_text(&json, &description) {
            Ok(estimate) => Ok(Some(estimate)),
            Err(err) if err == INVALID_MEAL_DESCRIPTION => Ok(None),
            Err(err) => Err(err),
        },
        None => Ok(None),
    }
}

pub fn write_cache(
    db: &Connection,
    normalized_key: &str,
    description: &str,
    estimate: &MealEstimate,
) -> Result<(), String> {
    let json = serde_json::to_string(estimate).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO meal_estimate_cache (normalized_key, description, result_json)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(normalized_key) DO UPDATE SET
           description = excluded.description,
           result_json = excluded.result_json,
           created_at = datetime('now')",
        params![normalized_key, description, json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn extract_api_error(body: &str) -> Option<(u16, String)> {
    let parsed: GoogleApiErrorBody = serde_json::from_str(body).ok()?;
    let code = parsed.error.code.unwrap_or(0) as u16;
    let message = parsed.error.message.unwrap_or_default();
    if message.is_empty() && code == 0 {
        None
    } else {
        Some((code, message))
    }
}

fn is_model_unavailable_message(message: &str) -> bool {
    let lower = message.to_lowercase();
    lower.contains("limit: 0")
        || lower.contains("limit:0")
        || lower.contains("not found")
        || lower.contains("is not supported")
        || lower.contains("does not exist")
}

fn is_billing_depleted_message(message: &str) -> bool {
    let lower = message.to_lowercase();
    lower.contains("prepayment credits")
        || lower.contains("credits are depleted")
        || lower.contains("billing details")
        || (lower.contains("billing") && lower.contains("depleted"))
}

fn map_gemini_error(http_status: u16, message: &str) -> String {
    let lower = message.to_lowercase();
    if http_status == 401
        || http_status == 403
        || lower.contains("api key")
        || lower.contains("permission denied")
    {
        return "Check your Gemini API key in Settings".to_string();
    }
    if is_billing_depleted_message(message) {
        return "Your Gemini prepayment credits are depleted. Add credits or update billing in Google AI Studio (https://aistudio.google.com).".to_string();
    }
    if is_model_unavailable_message(message) {
        return format!(
            "The model isn't available on your Gemini plan. Try \"{}\" in Settings, or enable billing in Google AI Studio.",
            DEFAULT_GEMINI_MODEL
        );
    }
    if http_status == 429 || lower.contains("resource_exhausted") || lower.contains("quota") {
        if lower.contains("please retry") {
            let summary = message
                .lines()
                .next()
                .unwrap_or("Gemini rate limit reached — try again shortly");
            return summary.to_string();
        }
        if !message.trim().is_empty() {
            return message.trim().to_string();
        }
        return "Gemini rate limit reached — try again in a minute".to_string();
    }
    if message.is_empty() {
        return "Could not reach Gemini — check connection".to_string();
    }
    message.to_string()
}

fn models_to_try(primary: &str) -> Vec<String> {
    let primary = primary.trim();
    let primary = if primary.is_empty() {
        DEFAULT_GEMINI_MODEL
    } else {
        primary
    };
    let mut models = vec![primary.to_string()];
    for fallback in FALLBACK_GEMINI_MODELS {
        if fallback != &primary && !models.iter().any(|m| m == fallback) {
            models.push((*fallback).to_string());
        }
    }
    models
}

fn truncate_storage_text(text: &str, max_chars: usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() <= max_chars {
        text.to_string()
    } else {
        format!(
            "{}…",
            chars[..max_chars.saturating_sub(1)]
                .iter()
                .collect::<String>()
        )
    }
}

fn gemini_model_rates(model: &str) -> (f64, f64) {
    match model {
        "gemini-2.5-pro" | "gemini-3.1-pro-preview" | "gemini-1.5-pro" => (1.25, 5.0),
        "gemini-2.5-flash"
        | "gemini-2.5-flash-lite"
        | "gemini-3.5-flash"
        | "gemini-3.1-flash-lite"
        | "gemini-3-flash-preview"
        | "gemini-2.0-flash"
        | "gemini-2.0-flash-lite"
        | "gemini-1.5-flash"
        | "gemini-1.5-flash-8b" => (0.075, 0.30),
        _ => (0.075, 0.30),
    }
}

fn estimate_cost_usd(model: &str, prompt_tokens: Option<i64>, output_tokens: Option<i64>) -> Option<f64> {
    let prompt_tokens = prompt_tokens?;
    let output_tokens = output_tokens?;
    let (input_per_million, output_per_million) = gemini_model_rates(model);
    let input_cost = (prompt_tokens as f64 / 1_000_000.0) * input_per_million;
    let output_cost = (output_tokens as f64 / 1_000_000.0) * output_per_million;
    Some(input_cost + output_cost)
}

pub fn estimate_cost_usd_public(
    model: &str,
    prompt_tokens: Option<i64>,
    output_tokens: Option<i64>,
) -> Option<f64> {
    estimate_cost_usd(model, prompt_tokens, output_tokens)
}

fn usage_from_payload(payload: &GeminiResponse) -> (Option<i64>, Option<i64>, Option<i64>) {
    let usage = payload.usage_metadata.as_ref();
    let prompt_tokens = usage.and_then(|u| u.prompt_token_count);
    let output_tokens = usage.and_then(|u| u.candidates_token_count);
    let total_tokens = usage
        .and_then(|u| u.total_token_count)
        .or_else(|| match (prompt_tokens, output_tokens) {
            (Some(prompt), Some(output)) => Some(prompt + output),
            _ => None,
        });
    (prompt_tokens, output_tokens, total_tokens)
}

fn build_call_log(
    description: &str,
    model: &str,
    prompt_kind: &str,
    request_prompt: &str,
    duration_ms: i64,
    http_status: Option<i64>,
    response_text: Option<String>,
    status: &str,
    error_message: Option<String>,
    prompt_tokens: Option<i64>,
    output_tokens: Option<i64>,
    total_tokens: Option<i64>,
) -> GeminiCallLog {
    GeminiCallLog {
        description: description.to_string(),
        model: model.to_string(),
        prompt_kind: prompt_kind.to_string(),
        request_prompt: request_prompt.to_string(),
        response_text: response_text.map(|text| truncate_storage_text(&text, 8000)),
        status: status.to_string(),
        error_message,
        http_status,
        prompt_tokens,
        output_tokens,
        total_tokens,
        estimated_cost_usd: estimate_cost_usd(model, prompt_tokens, output_tokens),
        duration_ms,
    }
}

async fn fetch_gemini_text(
    client: &reqwest::Client,
    api_key: &str,
    model: &str,
    description: &str,
    prompt_kind: &str,
    prompt: &str,
) -> (Result<String, String>, GeminiCallLog) {
    let started = std::time::Instant::now();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    );
    let body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart {
                text: prompt.to_string(),
            }],
        }],
        generation_config: GeminiGenerationConfig {
            response_mime_type: "application/json".to_string(),
        },
    };

    let response = match client.post(&url).json(&body).send().await {
        Ok(response) => response,
        Err(_) => {
            let duration_ms = started.elapsed().as_millis() as i64;
            let error = "Could not reach Gemini — check connection".to_string();
            let log = build_call_log(
                description,
                model,
                prompt_kind,
                prompt,
                duration_ms,
                None,
                None,
                "error",
                Some(error.clone()),
                None,
                None,
                None,
            );
            return (Err(error), log);
        }
    };

    let http_status = response.status().as_u16();
    let body_text = match response.text().await {
        Ok(text) => text,
        Err(_) => {
            let duration_ms = started.elapsed().as_millis() as i64;
            let error = "Could not reach Gemini — check connection".to_string();
            let log = build_call_log(
                description,
                model,
                prompt_kind,
                prompt,
                duration_ms,
                Some(http_status as i64),
                None,
                "error",
                Some(error.clone()),
                None,
                None,
                None,
            );
            return (Err(error), log);
        }
    };
    let duration_ms = started.elapsed().as_millis() as i64;

    if http_status >= 400 {
        let (mapped, message) = if let Some((code, message)) = extract_api_error(&body_text) {
            let status = if code >= 400 { code } else { http_status };
            (map_gemini_error(status, &message), message)
        } else {
            (map_gemini_error(http_status, ""), String::new())
        };
        let log = build_call_log(
            description,
            model,
            prompt_kind,
            prompt,
            duration_ms,
            Some(http_status as i64),
            Some(body_text),
            "error",
            Some(if mapped.is_empty() { message } else { mapped.clone() }),
            None,
            None,
            None,
        );
        return (Err(mapped), log);
    }

    let payload: GeminiResponse = match serde_json::from_str(&body_text) {
        Ok(payload) => payload,
        Err(_) => {
            let mapped = if let Some((code, message)) = extract_api_error(&body_text) {
                map_gemini_error(code, &message)
            } else {
                "Could not reach Gemini — check connection".to_string()
            };
            let log = build_call_log(
                description,
                model,
                prompt_kind,
                prompt,
                duration_ms,
                Some(http_status as i64),
                Some(body_text),
                "error",
                Some(mapped.clone()),
                None,
                None,
                None,
            );
            return (Err(mapped), log);
        }
    };

    let (prompt_tokens, output_tokens, total_tokens) = usage_from_payload(&payload);

    if let Some(error) = payload.error {
        let message = error.message.unwrap_or_default();
        let code = error.code.map(|c| c as u16).unwrap_or(http_status);
        let mapped = map_gemini_error(code, &message);
        let log = build_call_log(
            description,
            model,
            prompt_kind,
            prompt,
            duration_ms,
            Some(code as i64),
            Some(body_text),
            "error",
            Some(mapped.clone()),
            prompt_tokens,
            output_tokens,
            total_tokens,
        );
        return (Err(mapped), log);
    }

    match payload
        .candidates
        .as_ref()
        .and_then(|c| c.first())
        .and_then(|c| c.content.as_ref())
        .and_then(|c| c.parts.as_ref())
        .and_then(|p| p.first())
        .and_then(|p| p.text.as_ref())
    {
        Some(text) => {
            let log = build_call_log(
                description,
                model,
                prompt_kind,
                prompt,
                duration_ms,
                Some(http_status as i64),
                Some(text.clone()),
                "success",
                None,
                prompt_tokens,
                output_tokens,
                total_tokens,
            );
            (Ok(text.clone()), log)
        }
        None => {
            let error = "Gemini returned an empty response — try again".to_string();
            let log = build_call_log(
                description,
                model,
                prompt_kind,
                prompt,
                duration_ms,
                Some(http_status as i64),
                Some(body_text),
                "error",
                Some(error.clone()),
                prompt_tokens,
                output_tokens,
                total_tokens,
            );
            (Err(error), log)
        }
    }
}

async fn call_gemini_once(
    client: &reqwest::Client,
    api_key: &str,
    model: &str,
    description: &str,
) -> (Result<MealEstimate, String>, Vec<GeminiCallLog>) {
    let mut logs = Vec::new();
    let prompt = build_prompt(description);
    let (text_result, estimate_log) =
        fetch_gemini_text(client, api_key, model, description, "estimate", &prompt).await;
    logs.push(estimate_log);
    let text = match text_result {
        Ok(text) => text,
        Err(err) => return (Err(err), logs),
    };

    if let Ok(estimate) = parse_estimate_from_text(&text, description) {
        return (Ok(estimate), logs);
    }

    let repair_prompt = build_repair_prompt(&text, description);
    let (repair_result, repair_log) =
        fetch_gemini_text(client, api_key, model, description, "repair", &repair_prompt).await;
    logs.push(repair_log);
    let repair_text = match repair_result {
        Ok(text) => text,
        Err(err) => return (Err(err), logs),
    };

    if let Ok(estimate) = parse_estimate_from_text(&repair_text, description) {
        return (Ok(estimate), logs);
    }

    (
        Err(INVALID_MEAL_DESCRIPTION.to_string()),
        logs,
    )
}

pub async fn call_gemini(
    api_key: &str,
    model: &str,
    description: &str,
) -> (Result<MealEstimate, String>, Vec<GeminiCallLog>) {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
    {
        Ok(client) => client,
        Err(err) => return (Err(err.to_string()), Vec::new()),
    };

    let candidates = models_to_try(model);
    let mut last_error = String::from("Could not reach Gemini — check connection");
    let mut all_logs = Vec::new();

    for (index, candidate) in candidates.iter().enumerate() {
        let (result, logs) = call_gemini_once(&client, api_key, candidate, description).await;
        all_logs.extend(logs);
        match result {
            Ok(estimate) => return (Ok(estimate), all_logs),
            Err(err) => {
                let can_retry = index + 1 < candidates.len()
                    && (is_model_unavailable_message(&err)
                        || err.contains("isn't available on your Gemini plan"));
                last_error = err;
                if !can_retry {
                    break;
                }
            }
        }
    }

    (Err(last_error), all_logs)
}

pub fn insert_api_logs(db: &Connection, logs: &[GeminiCallLog]) -> Result<(), String> {
    for log in logs {
        db.execute(
            "INSERT INTO meal_estimate_api_logs (
                description, model, prompt_kind, request_prompt, response_text,
                status, error_message, http_status, prompt_tokens, output_tokens,
                total_tokens, estimated_cost_usd, duration_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                log.description,
                log.model,
                log.prompt_kind,
                log.request_prompt,
                log.response_text,
                log.status,
                log.error_message,
                log.http_status,
                log.prompt_tokens,
                log.output_tokens,
                log.total_tokens,
                log.estimated_cost_usd,
                log.duration_ms,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn map_api_log_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<MealEstimateApiLog> {
    Ok(MealEstimateApiLog {
        id: row.get(0)?,
        created_at: row.get(1)?,
        description: row.get(2)?,
        model: row.get(3)?,
        prompt_kind: row.get(4)?,
        request_prompt: row.get(5)?,
        response_text: row.get(6)?,
        status: row.get(7)?,
        error_message: row.get(8)?,
        http_status: row.get(9)?,
        prompt_tokens: row.get(10)?,
        output_tokens: row.get(11)?,
        total_tokens: row.get(12)?,
        estimated_cost_usd: row.get(13)?,
        duration_ms: row.get(14)?,
    })
}

pub fn list_api_logs(db: &Connection, limit: i32) -> Result<Vec<MealEstimateApiLog>, String> {
    let limit = limit.clamp(1, 500);
    let mut stmt = db
        .prepare(
            "SELECT id, created_at, description, model, prompt_kind, request_prompt,
                    response_text, status, error_message, http_status, prompt_tokens,
                    output_tokens, total_tokens, estimated_cost_usd, duration_ms
             FROM meal_estimate_api_logs
             ORDER BY datetime(created_at) DESC, id DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([limit], map_api_log_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn clear_api_logs(db: &Connection) -> Result<(), String> {
    db.execute("DELETE FROM meal_estimate_api_logs", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn sanitize_estimate(estimate: MealEstimate) -> Result<MealEstimate, String> {
    let description = estimate.name.clone();
    Ok(coerce_estimate(estimate, &description))
}

pub fn estimated_food_name(name: &str) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return "(estimated)".to_string();
    }
    if trimmed.ends_with("(estimated)") {
        trimmed.to_string()
    } else {
        format!("{trimmed} (estimated)")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_description_collapses_whitespace_and_punctuation() {
        assert_eq!(
            normalize_description("Chicken Alfredo,  heavy  sauce!!!"),
            "chicken alfredo heavy sauce"
        );
    }

    #[test]
    fn parse_estimate_accepts_markdown_wrapped_json_and_alt_keys() {
        let text = r#"```json
{"meal":"Chicken alfredo","kcal":920,"protein_g":42,"carbs_g":68,"fat_g":52,"confidence":"medium","notes":"Restaurant portion"}
```"#;
        let estimate = parse_estimate_from_text(text, "fallback name").unwrap();
        assert_eq!(estimate.name, "Chicken alfredo");
        assert_eq!(estimate.calories, 920.0);
        assert_eq!(estimate.protein, Some(42.0));
    }

    #[test]
    fn parse_estimate_rejects_low_confidence() {
        let text = r#"{"name":"dsqsq","calories":500,"protein":0,"carbs":0,"fat":0,"fiber":0,"salt":0,"confidence":"low","notes":"The description provided is not food-related and contains no recognizable food items to estimate."}"#;
        let err = parse_estimate_from_text(text, "dsqsq").unwrap_err();
        assert_eq!(err, INVALID_MEAL_DESCRIPTION);
    }

    #[test]
    fn parse_estimate_rejects_insufficient_detail_response() {
        let text = r#"{"error":"insufficient_detail","name":"","calories":0,"confidence":"low","notes":"Too vague"}"#;
        let err = parse_estimate_from_text(text, "x").unwrap_err();
        assert_eq!(err, INVALID_MEAL_DESCRIPTION);
    }

    #[test]
    fn parse_estimate_rejects_missing_calories_coerced_to_low() {
        let text = r#"{"name":"Salad","calories":0,"confidence":"medium","notes":""}"#;
        let err = parse_estimate_from_text(text, "salad").unwrap_err();
        assert_eq!(err, INVALID_MEAL_DESCRIPTION);
    }

    #[test]
    fn coerce_estimate_fills_missing_calories() {
        let estimate = coerce_estimate(
            MealEstimate {
                name: "Salad".to_string(),
                calories: 0.0,
                protein: None,
                carbs: None,
                fat: None,
                fiber: None,
                salt: None,
                confidence: "medium".to_string(),
                notes: String::new(),
            },
            "Large salad with dressing",
        );
        assert_eq!(estimate.calories, 500.0);
        assert_eq!(estimate.confidence, "low");
    }

    #[test]
    fn map_gemini_error_detects_depleted_prepay_credits() {
        let msg = "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.";
        let mapped = map_gemini_error(429, msg);
        assert!(mapped.contains("prepayment credits"));
        assert!(!mapped.contains("try again in a minute"));
    }

    #[test]
    fn map_gemini_error_detects_free_tier_limit_zero() {
        let msg = "Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash";
        let mapped = map_gemini_error(429, msg);
        assert!(mapped.contains("gemini-2.5-flash"));
        assert!(mapped.contains("isn't available"));
    }

    #[test]
    fn normalize_meal_estimate_model_defaults_and_validates() {
        assert_eq!(
            normalize_meal_estimate_model(""),
            DEFAULT_GEMINI_MODEL.to_string()
        );
        assert_eq!(
            normalize_meal_estimate_model("gemini-2.5-pro"),
            "gemini-2.5-pro".to_string()
        );
        assert_eq!(
            normalize_meal_estimate_model("gemini-2.0-flash"),
            "gemini-2.0-flash".to_string()
        );
        assert_eq!(
            normalize_meal_estimate_model("unknown-model"),
            DEFAULT_GEMINI_MODEL.to_string()
        );
    }

    #[test]
    fn models_to_try_includes_fallbacks() {
        let models = models_to_try("gemini-2.0-flash");
        assert_eq!(models[0], "gemini-2.0-flash");
        assert!(models.contains(&"gemini-2.5-flash".to_string()));
    }

    #[test]
    fn estimate_cost_usd_uses_token_counts() {
        let cost = estimate_cost_usd("gemini-2.5-flash", Some(1_000), Some(500)).unwrap();
        assert!((cost - 0.000225).abs() < 0.000001);
    }
}
