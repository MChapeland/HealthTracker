use crate::app::error::AppError;
use crate::app::sync_service;
use crate::http::errors::ApiError;
use crate::http::state::{PendingOAuth, SharedState};
use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect, Response},
    routing::get,
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Instant;

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v3/userinfo";
const SCOPES: &str = "openid email profile https://www.googleapis.com/auth/drive.appdata";
const PENDING_TTL_SECS: u64 = 600;

fn random_token(len: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| {
            const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
            CHARS[rng.gen_range(0..CHARS.len())] as char
        })
        .collect()
}

fn code_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

fn web_redirect(state: &SharedState, query: &str) -> Redirect {
    let base = state.web_base_url.trim_end_matches('/');
    if base.is_empty() {
        Redirect::to(&format!("/{query}"))
    } else {
        Redirect::to(&format!("{base}/{query}"))
    }
}

/// Begins the web Google OAuth flow: creates PKCE + state, then redirects the
/// browser to Google's consent screen.
async fn google_start(State(state): State<SharedState>) -> Response {
    let Some(google) = state.google.clone() else {
        return web_redirect(&state, "?googleError=not_configured").into_response();
    };

    let verifier = random_token(64);
    let challenge = code_challenge(&verifier);
    let csrf = random_token(32);

    if let Ok(mut pending) = state.pending_oauth.lock() {
        let now = Instant::now();
        pending.retain(|_, v| now.duration_since(v.created_at).as_secs() < PENDING_TTL_SECS);
        pending.insert(
            csrf.clone(),
            PendingOAuth {
                pkce_verifier: verifier,
                created_at: now,
            },
        );
    }

    let url = format!(
        "{GOOGLE_AUTH_URL}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&include_granted_scopes=true&state={}&code_challenge={}&code_challenge_method=S256",
        urlencoding::encode(&google.client_id),
        urlencoding::encode(&google.redirect_uri),
        urlencoding::encode(SCOPES),
        urlencoding::encode(&csrf),
        urlencoding::encode(&challenge),
    );
    Redirect::to(&url).into_response()
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    refresh_token: Option<String>,
    id_token: Option<String>,
}

#[derive(Deserialize)]
struct UserInfo {
    email: Option<String>,
}

fn email_from_id_token(id_token: &str) -> Option<String> {
    let payload = id_token.split('.').nth(1)?;
    let decoded = URL_SAFE_NO_PAD.decode(payload).ok()?;
    let json: serde_json::Value = serde_json::from_slice(&decoded).ok()?;
    json.get("email")?.as_str().map(|s| s.to_string())
}

async fn fetch_email(access_token: &str) -> Option<String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(GOOGLE_USERINFO_URL)
        .bearer_auth(access_token)
        .send()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    resp.json::<UserInfo>().await.ok()?.email
}

/// Handles Google's redirect back: validates state, exchanges the code for
/// tokens server-side, and persists the refresh token. The browser never sees
/// the client secret or refresh token.
async fn google_callback(
    State(state): State<SharedState>,
    Query(query): Query<CallbackQuery>,
) -> Response {
    if let Some(error) = query.error {
        return web_redirect(&state, &format!("?googleError={}", urlencoding::encode(&error)))
            .into_response();
    }

    let Some(google) = state.google.clone() else {
        return web_redirect(&state, "?googleError=not_configured").into_response();
    };
    let (Some(code), Some(csrf)) = (query.code, query.state) else {
        return web_redirect(&state, "?googleError=missing_code").into_response();
    };

    let verifier = {
        let mut pending = match state.pending_oauth.lock() {
            Ok(p) => p,
            Err(_) => return web_redirect(&state, "?googleError=server_error").into_response(),
        };
        match pending.remove(&csrf) {
            Some(p) => p.pkce_verifier,
            None => return web_redirect(&state, "?googleError=invalid_state").into_response(),
        }
    };

    let client = reqwest::Client::new();
    let token_result = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("code", code.as_str()),
            ("client_id", google.client_id.as_str()),
            ("client_secret", google.client_secret.as_str()),
            ("redirect_uri", google.redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await;

    let tokens: TokenResponse = match token_result {
        Ok(resp) if resp.status().is_success() => match resp.json().await {
            Ok(t) => t,
            Err(_) => return web_redirect(&state, "?googleError=token_parse").into_response(),
        },
        _ => return web_redirect(&state, "?googleError=token_exchange").into_response(),
    };

    let Some(refresh_token) = tokens.refresh_token else {
        return web_redirect(&state, "?googleError=no_refresh_token").into_response();
    };

    let email = tokens
        .id_token
        .as_deref()
        .and_then(email_from_id_token)
        .or(match tokens.access_token.as_deref() {
            Some(token) => fetch_email(token).await,
            None => None,
        });

    let Some(email) = email else {
        return web_redirect(&state, "?googleError=no_email").into_response();
    };

    match sync_service::save_google_auth(&state.app, email, refresh_token) {
        Ok(()) => web_redirect(&state, "?google=connected").into_response(),
        Err(_) => web_redirect(&state, "?googleError=save_failed").into_response(),
    }
}

#[derive(Deserialize)]
struct RefreshResponse {
    access_token: Option<String>,
    expires_in: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AccessTokenResponse {
    access_token: String,
    expires_at: Option<i64>,
}

/// Mints a short-lived Google access token from the server-stored refresh
/// token. Used by the web sync flow so the browser never holds the refresh
/// token or client secret.
async fn google_access_token(
    State(state): State<SharedState>,
) -> Result<Json<AccessTokenResponse>, ApiError> {
    let google = state
        .google
        .clone()
        .ok_or_else(|| AppError::bad_request("Google OAuth is not configured"))?;
    let refresh_token = sync_service::get_google_refresh_token(&state.app)?
        .ok_or_else(|| AppError::bad_request("Not connected to Google"))?;

    let client = reqwest::Client::new();
    let resp = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("client_id", google.client_id.as_str()),
            ("client_secret", google.client_secret.as_str()),
            ("refresh_token", refresh_token.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| AppError::internal(format!("token request failed: {e}")))?;

    if !resp.status().is_success() {
        return Err(ApiError(AppError::internal(
            "Failed to refresh Google access token",
        )));
    }

    let tokens: RefreshResponse = resp
        .json()
        .await
        .map_err(|e| AppError::internal(format!("token parse failed: {e}")))?;
    let access_token = tokens
        .access_token
        .ok_or_else(|| AppError::internal("No access token returned"))?;
    let expires_at = tokens.expires_in.map(|secs| {
        chrono::Utc::now().timestamp_millis() + secs * 1000
    });

    Ok(Json(AccessTokenResponse {
        access_token,
        expires_at,
    }))
}

/// Web Google OAuth routes (mounted behind the auth gate).
pub fn oauth_routes() -> Router<SharedState> {
    Router::new()
        .route("/auth/google/start", get(google_start))
        .route("/auth/google/callback", get(google_callback))
        .route("/auth/google/access_token", get(google_access_token))
}
