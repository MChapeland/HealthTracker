use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct GeminiJsonRequest {
    pub contents: Vec<GeminiJsonContent>,
    #[serde(rename = "generationConfig")]
    pub generation_config: GeminiJsonGenerationConfig,
}

#[derive(Serialize)]
pub struct GeminiJsonContent {
    pub parts: Vec<GeminiJsonPart>,
}

#[derive(Serialize)]
pub struct GeminiJsonPart {
    pub text: String,
}

#[derive(Serialize)]
pub struct GeminiJsonGenerationConfig {
    #[serde(rename = "responseMimeType")]
    pub response_mime_type: String,
}

#[derive(Deserialize)]
pub struct GeminiJsonResponse {
    pub candidates: Option<Vec<GeminiJsonCandidate>>,
    pub error: Option<GeminiJsonError>,
    #[serde(rename = "usageMetadata")]
    pub usage_metadata: Option<GeminiJsonUsageMetadata>,
}

#[derive(Deserialize)]
pub struct GeminiJsonUsageMetadata {
    #[serde(rename = "promptTokenCount")]
    pub prompt_token_count: Option<i64>,
    #[serde(rename = "candidatesTokenCount")]
    pub candidates_token_count: Option<i64>,
    #[serde(rename = "totalTokenCount")]
    pub total_token_count: Option<i64>,
}

#[derive(Deserialize)]
pub struct GeminiJsonCandidate {
    pub content: Option<GeminiJsonCandidateContent>,
}

#[derive(Deserialize)]
pub struct GeminiJsonCandidateContent {
    pub parts: Option<Vec<GeminiJsonResponsePart>>,
}

#[derive(Deserialize)]
pub struct GeminiJsonResponsePart {
    pub text: Option<String>,
}

#[derive(Deserialize)]
pub struct GeminiJsonError {
    pub message: Option<String>,
    pub code: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct GeminiCallResult {
    pub response_text: String,
    pub http_status: i64,
    pub prompt_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub total_tokens: Option<i64>,
    pub duration_ms: i64,
}

pub async fn call_gemini_json(
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<GeminiCallResult, String> {
    let started = std::time::Instant::now();
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    );
    let body = GeminiJsonRequest {
        contents: vec![GeminiJsonContent {
            parts: vec![GeminiJsonPart {
                text: prompt.to_string(),
            }],
        }],
        generation_config: GeminiJsonGenerationConfig {
            response_mime_type: "application/json".to_string(),
        },
    };

    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|_| "Could not reach Gemini — check connection".to_string())?;

    let http_status = response.status().as_u16() as i64;
    let body_text = response
        .text()
        .await
        .map_err(|_| "Could not reach Gemini — check connection".to_string())?;
    let duration_ms = started.elapsed().as_millis() as i64;

    if http_status >= 400 {
        return Err(map_gemini_http_error(http_status, &body_text));
    }

    let payload: GeminiJsonResponse = serde_json::from_str(&body_text)
        .map_err(|_| "Unexpected Gemini response".to_string())?;

    if let Some(error) = payload.error {
        let code = error.code.unwrap_or(http_status);
        let message = error.message.unwrap_or_default();
        return Err(map_gemini_http_error(code, &message));
    }

    let text = payload
        .candidates
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.content)
        .and_then(|c| c.parts)
        .and_then(|p| p.into_iter().next())
        .and_then(|p| p.text)
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| "Gemini returned an empty response".to_string())?;

    let usage = payload.usage_metadata.as_ref();
    let prompt_tokens = usage.and_then(|u| u.prompt_token_count);
    let output_tokens = usage.and_then(|u| u.candidates_token_count);
    let total_tokens = usage
        .and_then(|u| u.total_token_count)
        .or_else(|| match (prompt_tokens, output_tokens) {
            (Some(a), Some(b)) => Some(a + b),
            _ => None,
        });

    Ok(GeminiCallResult {
        response_text: text,
        http_status,
        prompt_tokens,
        output_tokens,
        total_tokens,
        duration_ms,
    })
}

fn map_gemini_http_error(status: i64, message: &str) -> String {
    let msg = message.trim();
    match status {
        401 | 403 => "Invalid Gemini API key — check Settings".to_string(),
        429 => "Gemini rate limit — try again later".to_string(),
        _ if !msg.is_empty() => msg.to_string(),
        _ => "Gemini request failed".to_string(),
    }
}

pub fn extract_json_blob(text: &str) -> String {
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
