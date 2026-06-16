mod app;
mod backup;
mod commands;
mod day_totals;
mod day_workouts;
mod db;
mod exercise_progress;
mod gemini;
pub mod http;
mod meal_estimate;
mod progress_feedback;
mod seed_foods;
mod sync;

use db::{init_db, AppState};
use tauri::Manager;

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_google_auth::init());
    builder
        .setup(|app| {
            let conn = init_db(app)?;
            let _ = backup::ensure_device_id(&conn);
            app.manage(AppState {
                db: std::sync::Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::update_settings,
            commands::list_foods,
            commands::get_food_last_eaten_dates,
            commands::create_food,
            commands::update_food,
            commands::delete_food,
            commands::list_workout_templates,
            commands::create_workout_template,
            commands::update_workout_template,
            commands::delete_workout_template,
            commands::list_routines,
            commands::create_routine,
            commands::update_routine,
            commands::delete_routine,
            commands::get_exercise_progress,
            commands::add_exercise_log,
            commands::delete_exercise_log,
            commands::get_routine_progress,
            commands::add_routine_log,
            commands::delete_routine_log,
            commands::get_day,
            commands::list_days,
            commands::upsert_day,
            commands::list_food_entries,
            commands::add_food_entry,
            commands::update_food_entry,
            commands::delete_food_entry,
            commands::estimate_meal,
            commands::generate_progress_feedback,
            commands::log_estimated_meal,
            commands::list_meal_estimate_api_logs,
            commands::clear_meal_estimate_api_logs,
            commands::list_workouts,
            commands::add_workout,
            commands::update_workout,
            commands::delete_workout,
            commands::get_metrics_range,
            commands::get_period_summary,
            commands::get_latest_weight,
            commands::export_backup,
            commands::export_sync_snapshot,
            commands::import_backup,
            commands::import_sync_snapshot,
            commands::get_sync_state,
            commands::save_google_auth,
            commands::clear_google_auth,
            commands::get_google_refresh_token,
            commands::mark_synced,
            commands::sync_push,
            commands::sync_pull,
            commands::read_backup_file,
            commands::write_backup_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
