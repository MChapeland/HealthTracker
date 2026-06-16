use crate::app::error::AppError;
use crate::http::errors::ApiError;
use crate::http::state::SharedState;
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use axum_extra::extract::cookie::{Cookie, SameSite, SignedCookieJar};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{Duration, Instant};
use subtle::ConstantTimeEq;

pub const SESSION_COOKIE: &str = "ht_session";

const MAX_FAILURES: u32 = 5;
const LOCKOUT_SECS: u64 = 30;

#[derive(Deserialize)]
struct LoginReq {
    password: String,
}

#[derive(Serialize)]
struct SessionResp {
    authenticated: bool,
}

/// Constant-time password comparison. Both inputs are hashed to a fixed length
/// first so differing lengths do not leak timing information.
fn password_matches(submitted: &str, expected: &str) -> bool {
    let a = Sha256::digest(submitted.as_bytes());
    let b = Sha256::digest(expected.as_bytes());
    a.as_slice().ct_eq(b.as_slice()).into()
}

fn session_cookie(secure: bool) -> Cookie<'static> {
    Cookie::build((SESSION_COOKIE, "1"))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .secure(secure)
        .build()
}

/// Rejects unauthenticated requests to the data API. Static assets and the
/// public auth routes are mounted outside this layer.
pub async fn require_auth(
    State(_state): State<SharedState>,
    jar: SignedCookieJar,
    request: Request,
    next: Next,
) -> Response {
    if jar.get(SESSION_COOKIE).is_some() {
        next.run(request).await
    } else {
        ApiError(AppError::unauthorized("Not signed in")).into_response()
    }
}

async fn login(
    State(state): State<SharedState>,
    jar: SignedCookieJar,
    Json(req): Json<LoginReq>,
) -> Result<(SignedCookieJar, Json<SessionResp>), ApiError> {
    {
        let mut throttle = state
            .login_throttle
            .lock()
            .map_err(|e| AppError::internal(e.to_string()))?;
        if let Some(until) = throttle.blocked_until {
            if Instant::now() < until {
                return Err(ApiError(AppError::new(
                    "Too many attempts. Please wait and try again.",
                    429,
                )));
            }
            throttle.blocked_until = None;
            throttle.failures = 0;
        }
    }

    if !password_matches(&req.password, &state.app_password) {
        let mut throttle = state
            .login_throttle
            .lock()
            .map_err(|e| AppError::internal(e.to_string()))?;
        throttle.failures += 1;
        if throttle.failures >= MAX_FAILURES {
            throttle.blocked_until = Some(Instant::now() + Duration::from_secs(LOCKOUT_SECS));
        }
        return Err(ApiError(AppError::unauthorized("Incorrect password")));
    }

    if let Ok(mut throttle) = state.login_throttle.lock() {
        throttle.failures = 0;
        throttle.blocked_until = None;
    }

    let jar = jar.add(session_cookie(state.secure_cookies));
    Ok((jar, Json(SessionResp { authenticated: true })))
}

async fn logout(jar: SignedCookieJar) -> (SignedCookieJar, Json<SessionResp>) {
    let jar = jar.remove(Cookie::from(SESSION_COOKIE));
    (jar, Json(SessionResp { authenticated: false }))
}

async fn session(jar: SignedCookieJar) -> Json<SessionResp> {
    Json(SessionResp {
        authenticated: jar.get(SESSION_COOKIE).is_some(),
    })
}

/// Public authentication routes (no auth required to reach them).
pub fn auth_routes() -> Router<SharedState> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/logout", post(logout))
        .route("/auth/session", get(session))
}
