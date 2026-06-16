//! Entry point for the cloud-hosted Health Tracker web server.
//!
//! Reuses the shared service layer and HTTP router from the main crate so the
//! browser client and the Tauri desktop app run identical business logic.

#[tokio::main]
async fn main() {
    if let Err(error) = tauri_app_lib::http::run_server().await {
        eprintln!("server error: {error}");
        std::process::exit(1);
    }
}
