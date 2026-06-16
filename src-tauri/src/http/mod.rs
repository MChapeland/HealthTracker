//! Cloud web server (Axum).
//!
//! Exposes the shared service layer over HTTP for the browser client, serves
//! the static Vite build, and gates data access behind single-user session
//! auth. Desktop continues to use the Tauri command layer; both share
//! `crate::app`.

pub mod auth;
pub mod errors;
pub mod oauth;
pub mod routes;
pub mod state;

use crate::db::{init_db_at, AppState};
use axum::{middleware, Router};
use axum_extra::extract::cookie::Key;
use state::{GoogleConfig, ServerState, SharedState};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;

fn load_cookie_key() -> Key {
    match std::env::var("SESSION_SECRET") {
        Ok(secret) if secret.len() >= 64 => Key::from(secret.as_bytes()),
        Ok(_) => {
            eprintln!(
                "warning: SESSION_SECRET is shorter than 64 bytes; generating an ephemeral key (sessions reset on restart)"
            );
            Key::generate()
        }
        Err(_) => {
            eprintln!(
                "warning: SESSION_SECRET not set; generating an ephemeral key (sessions reset on restart)"
            );
            Key::generate()
        }
    }
}

fn load_google_config() -> Option<GoogleConfig> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID").ok()?;
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").ok()?;
    if client_id.trim().is_empty() || client_secret.trim().is_empty() {
        return None;
    }
    let web_base_url = std::env::var("WEB_BASE_URL").unwrap_or_default();
    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URI").unwrap_or_else(|_| {
        format!(
            "{}/api/auth/google/callback",
            web_base_url.trim_end_matches('/')
        )
    });
    Some(GoogleConfig {
        client_id,
        client_secret,
        redirect_uri,
    })
}

fn cors_layer() -> Option<CorsLayer> {
    let origins = std::env::var("WEB_CORS_ORIGINS").ok()?;
    let parsed: Vec<_> = origins
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .filter_map(|s| s.parse::<axum::http::HeaderValue>().ok())
        .collect();
    if parsed.is_empty() {
        return None;
    }
    Some(
        CorsLayer::new()
            .allow_origin(parsed)
            .allow_credentials(true)
            .allow_methods([axum::http::Method::GET, axum::http::Method::POST])
            .allow_headers([axum::http::header::CONTENT_TYPE]),
    )
}

/// Build the full application router (API + auth + static SPA).
pub fn build_router(state: SharedState) -> Router {
    let dist_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "dist".to_string());
    let dist_path = PathBuf::from(&dist_dir);
    let index_html = dist_path.join("index.html");

    // Data endpoints + web Google OAuth require an authenticated session.
    let protected = routes::data_routes()
        .merge(oauth::oauth_routes())
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            auth::require_auth,
        ));

    // Public auth endpoints (login/logout/session) sit outside the gate.
    let api = Router::new().merge(auth::auth_routes()).merge(protected);

    // Static SPA: serve dist/, falling back to index.html for client routes.
    let serve_dir =
        ServeDir::new(&dist_path).not_found_service(ServeFile::new(index_html.clone()));

    let mut app = Router::new()
        .nest("/api", api)
        .fallback_service(serve_dir)
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    if let Some(cors) = cors_layer() {
        app = app.layer(cors);
    }

    app
}

/// Read configuration from the environment, initialize the database, and serve.
pub async fn run_server() -> Result<(), Box<dyn std::error::Error>> {
    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "data/tracker.db".to_string());
    let conn = init_db_at(std::path::Path::new(&db_path))
        .map_err(|e| format!("failed to open database at {db_path}: {e}"))?;
    let _ = crate::backup::ensure_device_id(&conn);

    let app_password = std::env::var("APP_PASSWORD").unwrap_or_default();
    if app_password.trim().is_empty() {
        return Err(
            "APP_PASSWORD is required to start the web server (single-user login gate)".into(),
        );
    }

    let secure_cookies = std::env::var("SECURE_COOKIES")
        .map(|v| v != "0" && v.to_lowercase() != "false")
        .unwrap_or(true);
    let web_base_url = std::env::var("WEB_BASE_URL").unwrap_or_default();

    let state = SharedState::new(ServerState {
        app: Arc::new(AppState {
            db: Mutex::new(conn),
        }),
        cookie_key: load_cookie_key(),
        app_password,
        secure_cookies,
        google: load_google_config(),
        pending_oauth: Mutex::new(std::collections::HashMap::new()),
        login_throttle: Mutex::new(state::LoginThrottle::default()),
        web_base_url,
    });

    let app = build_router(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    println!("Health Tracker web server listening on http://{addr}");
    axum::serve(listener, app.into_make_service()).await?;
    Ok(())
}
