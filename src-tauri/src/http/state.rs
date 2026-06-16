use crate::db::AppState;
use axum::extract::FromRef;
use axum_extra::extract::cookie::Key;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

/// Per-attempt throttling for the single-user login endpoint.
#[derive(Default)]
pub struct LoginThrottle {
    pub failures: u32,
    pub blocked_until: Option<Instant>,
}

/// An in-flight web Google OAuth authorization, keyed by the `state` param.
pub struct PendingOAuth {
    pub pkce_verifier: String,
    pub created_at: Instant,
}

/// Server-side Google OAuth configuration (web flow). Secrets stay here and are
/// never sent to the browser.
#[derive(Clone)]
pub struct GoogleConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

/// Shared state for the Axum server. Wraps the same [`AppState`] used by the
/// Tauri app so both transports run identical service logic.
pub struct ServerState {
    pub app: Arc<AppState>,
    pub cookie_key: Key,
    /// Login password gate. When `None`, the server refuses to start.
    pub app_password: String,
    /// Marks session cookies `Secure` (production HTTPS).
    pub secure_cookies: bool,
    pub google: Option<GoogleConfig>,
    pub pending_oauth: Mutex<HashMap<String, PendingOAuth>>,
    pub login_throttle: Mutex<LoginThrottle>,
    /// Base URL of the web app, used to build OAuth redirects back to the SPA.
    pub web_base_url: String,
}

/// Cheaply-cloneable handle to the server state used as the Axum router state.
/// A local newtype (rather than a bare `Arc`) so we can implement `FromRef`.
#[derive(Clone)]
pub struct SharedState(pub Arc<ServerState>);

impl SharedState {
    pub fn new(state: ServerState) -> Self {
        SharedState(Arc::new(state))
    }
}

impl std::ops::Deref for SharedState {
    type Target = ServerState;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

// Enables `SignedCookieJar` to pull the signing key out of the shared state.
impl FromRef<SharedState> for Key {
    fn from_ref(state: &SharedState) -> Self {
        state.0.cookie_key.clone()
    }
}
