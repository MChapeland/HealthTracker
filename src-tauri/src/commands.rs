//! Tauri command layer.
//!
//! Every command is a thin wrapper that locks/forwards to the shared service
//! layer in `crate::app`. The data models and SQL helpers are re-exported here
//! so existing modules (`backup`, `exercise_progress`) keep importing them from
//! `crate::commands::*` unchanged.

pub use crate::app::models::*;

use crate::app::{
    ai_service, backup_service, day_service, meals_service, settings_service, sync_service,
    workouts_service,
};
use crate::db::AppState;
use crate::exercise_progress::{
    ExerciseLogInput, ExerciseProgress, RoutineLogExerciseInput, RoutineProgress,
};
use crate::meal_estimate::{MealEstimate, MealEstimateApiLog};
use crate::progress_feedback::{ProgressFeedbackRequest, ProgressFeedbackResponse};
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<Settings, String> {
    settings_service::get_settings(&state)
}

#[tauri::command]
pub fn update_settings(state: State<AppState>, settings: Settings) -> Result<(), String> {
    settings_service::update_settings(&state, settings)
}

#[tauri::command]
pub fn get_food_last_eaten_dates(state: State<AppState>) -> Result<HashMap<i64, String>, String> {
    meals_service::get_food_last_eaten_dates(&state)
}

#[tauri::command]
pub fn list_foods(state: State<AppState>, query: Option<String>) -> Result<Vec<Food>, String> {
    meals_service::list_foods(&state, query)
}

#[tauri::command]
pub fn create_food(state: State<AppState>, food: Food) -> Result<Food, String> {
    meals_service::create_food(&state, food)
}

#[tauri::command]
pub fn update_food(state: State<AppState>, food: Food) -> Result<Food, String> {
    meals_service::update_food(&state, food)
}

#[tauri::command]
pub fn delete_food(state: State<AppState>, id: i64) -> Result<(), String> {
    meals_service::delete_food(&state, id)
}

#[tauri::command]
pub fn list_workout_templates(
    state: State<AppState>,
    query: Option<String>,
) -> Result<Vec<WorkoutTemplate>, String> {
    workouts_service::list_workout_templates(&state, query)
}

#[tauri::command]
pub fn create_workout_template(
    state: State<AppState>,
    template: WorkoutTemplate,
) -> Result<WorkoutTemplate, String> {
    workouts_service::create_workout_template(&state, template)
}

#[tauri::command]
pub fn update_workout_template(
    state: State<AppState>,
    template: WorkoutTemplate,
) -> Result<WorkoutTemplate, String> {
    workouts_service::update_workout_template(&state, template)
}

#[tauri::command]
pub fn delete_workout_template(state: State<AppState>, id: i64) -> Result<(), String> {
    workouts_service::delete_workout_template(&state, id)
}

#[tauri::command]
pub fn list_routines(state: State<AppState>, query: Option<String>) -> Result<Vec<Routine>, String> {
    workouts_service::list_routines(&state, query)
}

#[tauri::command]
pub fn create_routine(
    state: State<AppState>,
    name: String,
    exercise_ids: Vec<i64>,
) -> Result<Routine, String> {
    workouts_service::create_routine(&state, name, exercise_ids)
}

#[tauri::command]
pub fn update_routine(
    state: State<AppState>,
    id: i64,
    name: String,
    exercise_ids: Vec<i64>,
) -> Result<Routine, String> {
    workouts_service::update_routine(&state, id, name, exercise_ids)
}

#[tauri::command]
pub fn delete_routine(state: State<AppState>, id: i64) -> Result<(), String> {
    workouts_service::delete_routine(&state, id)
}

#[tauri::command]
pub fn get_exercise_progress(
    state: State<AppState>,
    exercise_id: i64,
) -> Result<ExerciseProgress, String> {
    workouts_service::get_exercise_progress(&state, exercise_id)
}

#[tauri::command]
pub fn add_exercise_log(
    state: State<AppState>,
    exercise_id: i64,
    input: ExerciseLogInput,
) -> Result<ExerciseProgress, String> {
    workouts_service::add_exercise_log(&state, exercise_id, input)
}

#[tauri::command]
pub fn delete_exercise_log(state: State<AppState>, log_id: i64) -> Result<(), String> {
    workouts_service::delete_exercise_log(&state, log_id)
}

#[tauri::command]
pub fn get_routine_progress(
    state: State<AppState>,
    routine_id: i64,
) -> Result<RoutineProgress, String> {
    workouts_service::get_routine_progress(&state, routine_id)
}

#[tauri::command]
pub fn add_routine_log(
    state: State<AppState>,
    routine_id: i64,
    day_date: String,
    entries: Vec<RoutineLogExerciseInput>,
) -> Result<RoutineProgress, String> {
    workouts_service::add_routine_log(&state, routine_id, day_date, entries)
}

#[tauri::command]
pub fn delete_routine_log(state: State<AppState>, log_id: i64) -> Result<(), String> {
    workouts_service::delete_routine_log(&state, log_id)
}

#[tauri::command]
pub fn get_day(state: State<AppState>, date: String) -> Result<DayRecord, String> {
    day_service::get_day(&state, date)
}

#[tauri::command]
pub fn list_days(
    state: State<AppState>,
    start: String,
    end: String,
) -> Result<Vec<DayRecord>, String> {
    day_service::list_days(&state, start, end)
}

#[tauri::command]
pub fn upsert_day(state: State<AppState>, day: DayInput) -> Result<DayRecord, String> {
    day_service::upsert_day(&state, day)
}

#[tauri::command]
pub fn list_food_entries(state: State<AppState>, date: String) -> Result<Vec<FoodEntry>, String> {
    meals_service::list_food_entries(&state, date)
}

#[tauri::command]
pub fn add_food_entry(
    state: State<AppState>,
    day_date: String,
    food_id: i64,
    quantity: f64,
    unit: String,
    calories: f64,
) -> Result<FoodEntry, String> {
    meals_service::add_food_entry(&state, day_date, food_id, quantity, unit, calories)
}

#[tauri::command]
pub fn update_food_entry(
    state: State<AppState>,
    id: i64,
    quantity: f64,
    unit: String,
    calories: f64,
) -> Result<FoodEntry, String> {
    meals_service::update_food_entry(&state, id, quantity, unit, calories)
}

#[tauri::command]
pub fn delete_food_entry(state: State<AppState>, id: i64) -> Result<(), String> {
    meals_service::delete_food_entry(&state, id)
}

#[tauri::command]
pub async fn estimate_meal(
    state: State<'_, AppState>,
    description: String,
) -> Result<MealEstimate, String> {
    ai_service::estimate_meal(&state, description).await
}

#[tauri::command]
pub async fn generate_progress_feedback(
    state: State<'_, AppState>,
    request: ProgressFeedbackRequest,
) -> Result<ProgressFeedbackResponse, String> {
    ai_service::generate_progress_feedback(&state, request).await
}

#[tauri::command]
pub fn list_meal_estimate_api_logs(
    state: State<AppState>,
    limit: Option<i32>,
) -> Result<Vec<MealEstimateApiLog>, String> {
    ai_service::list_meal_estimate_api_logs(&state, limit)
}

#[tauri::command]
pub fn clear_meal_estimate_api_logs(state: State<AppState>) -> Result<(), String> {
    ai_service::clear_meal_estimate_api_logs(&state)
}

#[tauri::command]
pub fn log_estimated_meal(
    state: State<AppState>,
    day_date: String,
    estimate: MealEstimate,
) -> Result<FoodEntry, String> {
    ai_service::log_estimated_meal(&state, day_date, estimate)
}

#[tauri::command]
pub fn list_workouts(state: State<AppState>, date: String) -> Result<Vec<WorkoutEntry>, String> {
    workouts_service::list_workouts(&state, date)
}

#[tauri::command]
pub fn add_workout(
    state: State<AppState>,
    day_date: String,
    workout_type: String,
    duration_min: i64,
    intensity: String,
    calories: Option<f64>,
    calories_override: bool,
) -> Result<WorkoutEntry, String> {
    workouts_service::add_workout(
        &state,
        day_date,
        workout_type,
        duration_min,
        intensity,
        calories,
        calories_override,
    )
}

#[tauri::command]
pub fn update_workout(
    state: State<AppState>,
    id: i64,
    workout_type: String,
    duration_min: i64,
    intensity: String,
    calories: Option<f64>,
    calories_override: bool,
) -> Result<WorkoutEntry, String> {
    workouts_service::update_workout(
        &state,
        id,
        workout_type,
        duration_min,
        intensity,
        calories,
        calories_override,
    )
}

#[tauri::command]
pub fn delete_workout(state: State<AppState>, id: i64) -> Result<(), String> {
    workouts_service::delete_workout(&state, id)
}

#[tauri::command]
pub fn get_metrics_range(
    state: State<AppState>,
    start: String,
    end: String,
) -> Result<Vec<MetricsPoint>, String> {
    day_service::get_metrics_range(&state, start, end)
}

#[tauri::command]
pub fn get_period_summary(state: State<AppState>, days: i64) -> Result<PeriodSummary, String> {
    day_service::get_period_summary(&state, days)
}

#[tauri::command]
pub fn get_latest_weight(
    state: State<AppState>,
    before_date: String,
) -> Result<Option<f64>, String> {
    day_service::get_latest_weight(&state, before_date)
}

#[tauri::command]
pub fn write_backup_file(path: String, contents: String) -> Result<(), String> {
    backup_service::write_backup_file(path, contents)
}

#[tauri::command]
pub fn read_backup_file(path: String) -> Result<String, String> {
    backup_service::read_backup_file(path)
}

#[tauri::command]
pub fn export_backup(state: State<AppState>) -> Result<BackupData, String> {
    backup_service::export_backup(&state)
}

#[tauri::command]
pub fn export_sync_snapshot(state: State<AppState>) -> Result<crate::backup::SyncSnapshot, String> {
    sync_service::export_sync_snapshot(&state)
}

#[tauri::command]
pub fn import_backup(state: State<AppState>, backup: BackupData) -> Result<(), String> {
    backup_service::import_backup(&state, backup)
}

#[tauri::command]
pub fn import_sync_snapshot(
    state: State<AppState>,
    snapshot: crate::backup::SyncSnapshot,
) -> Result<(), String> {
    sync_service::import_sync_snapshot(&state, snapshot)
}

#[tauri::command]
pub fn get_sync_state(state: State<AppState>) -> Result<crate::backup::SyncState, String> {
    sync_service::get_sync_state(&state)
}

#[tauri::command]
pub fn save_google_auth(
    state: State<AppState>,
    email: String,
    refresh_token: String,
) -> Result<(), String> {
    sync_service::save_google_auth(&state, email, refresh_token)
}

#[tauri::command]
pub fn clear_google_auth(state: State<AppState>) -> Result<(), String> {
    sync_service::clear_google_auth(&state)
}

#[tauri::command]
pub fn get_google_refresh_token(state: State<AppState>) -> Result<Option<String>, String> {
    sync_service::get_google_refresh_token(&state)
}

#[tauri::command]
pub fn mark_synced(state: State<AppState>, synced_at: String) -> Result<(), String> {
    sync_service::mark_synced(&state, synced_at)
}

#[tauri::command]
pub fn sync_push(
    state: State<AppState>,
    access_token: String,
) -> Result<crate::backup::SyncSnapshot, String> {
    sync_service::sync_push(&state, access_token)
}

#[tauri::command]
pub fn sync_pull(access_token: String) -> Result<crate::sync::SyncPullResult, String> {
    sync_service::sync_pull(access_token)
}
