//! Shared application service layer.
//!
//! These modules hold the business logic for every operation, taking
//! `&AppState` (or `&Connection`) and typed arguments and returning typed
//! results. Both the Tauri command layer (`crate::commands`) and the HTTP
//! server (`crate::http`) are thin transports over these services, so desktop
//! and web share identical behavior.

pub mod ai_service;
pub mod backup_service;
pub mod day_service;
pub mod error;
pub mod meals_service;
pub mod models;
pub mod settings_service;
pub mod sync_service;
pub mod workouts_service;
