use crate::app::models::{
    BackupData, DayInput, DayRecord, Food, FoodEntry, MetricsPoint, PeriodSummary, Routine,
    Settings, WorkoutEntry, WorkoutTemplate,
};
use crate::app::{
    ai_service, backup_service, day_service, meals_service, settings_service, sync_service,
    workouts_service,
};
use crate::backup::{SyncSnapshot, SyncState};
use crate::exercise_progress::{
    ExerciseLogInput, ExerciseProgress, RoutineLogExerciseInput, RoutineProgress,
};
use crate::http::errors::ApiError;
use crate::http::state::SharedState;
use crate::meal_estimate::{MealEstimate, MealEstimateApiLog};
use crate::progress_feedback::{ProgressFeedbackRequest, ProgressFeedbackResponse};
use crate::sync::SyncPullResult;
use axum::{extract::State, routing::post, Json, Router};
use serde::Deserialize;
use std::collections::HashMap;

type ApiResult<T> = Result<Json<T>, ApiError>;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryReq {
    query: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FoodReq {
    food: Food,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdReq {
    id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TemplateReq {
    template: WorkoutTemplate,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateRoutineReq {
    name: String,
    exercise_ids: Vec<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateRoutineReq {
    id: i64,
    name: String,
    exercise_ids: Vec<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExerciseIdReq {
    exercise_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddExerciseLogReq {
    exercise_id: i64,
    input: ExerciseLogInput,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LogIdReq {
    log_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RoutineIdReq {
    routine_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddRoutineLogReq {
    routine_id: i64,
    day_date: String,
    entries: Vec<RoutineLogExerciseInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DateReq {
    date: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RangeReq {
    start: String,
    end: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DayReq {
    day: DayInput,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddFoodEntryReq {
    day_date: String,
    food_id: i64,
    quantity: f64,
    unit: String,
    calories: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateFoodEntryReq {
    id: i64,
    quantity: f64,
    unit: String,
    calories: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DescriptionReq {
    description: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LogEstimatedMealReq {
    day_date: String,
    estimate: MealEstimate,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LimitReq {
    limit: Option<i32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProgressFeedbackReq {
    request: ProgressFeedbackRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddWorkoutReq {
    day_date: String,
    workout_type: String,
    duration_min: i64,
    intensity: String,
    calories: Option<f64>,
    calories_override: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateWorkoutReq {
    id: i64,
    workout_type: String,
    duration_min: i64,
    intensity: String,
    calories: Option<f64>,
    calories_override: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DaysReq {
    days: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BeforeDateReq {
    before_date: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupReq {
    backup: BackupData,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotReq {
    snapshot: SyncSnapshot,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveGoogleAuthReq {
    email: String,
    refresh_token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarkSyncedReq {
    synced_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccessTokenReq {
    access_token: String,
}

async fn get_settings(State(state): State<SharedState>) -> ApiResult<Settings> {
    Ok(Json(settings_service::get_settings(&state.app)?))
}

async fn update_settings(
    State(state): State<SharedState>,
    Json(req): Json<SettingsReq>,
) -> ApiResult<()> {
    Ok(Json(settings_service::update_settings(&state.app, req.settings)?))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsReq {
    settings: Settings,
}

async fn get_food_last_eaten_dates(
    State(state): State<SharedState>,
) -> ApiResult<HashMap<i64, String>> {
    Ok(Json(meals_service::get_food_last_eaten_dates(&state.app)?))
}

async fn list_foods(
    State(state): State<SharedState>,
    Json(req): Json<QueryReq>,
) -> ApiResult<Vec<Food>> {
    Ok(Json(meals_service::list_foods(&state.app, req.query)?))
}

async fn create_food(
    State(state): State<SharedState>,
    Json(req): Json<FoodReq>,
) -> ApiResult<Food> {
    Ok(Json(meals_service::create_food(&state.app, req.food)?))
}

async fn update_food(
    State(state): State<SharedState>,
    Json(req): Json<FoodReq>,
) -> ApiResult<Food> {
    Ok(Json(meals_service::update_food(&state.app, req.food)?))
}

async fn delete_food(
    State(state): State<SharedState>,
    Json(req): Json<IdReq>,
) -> ApiResult<()> {
    Ok(Json(meals_service::delete_food(&state.app, req.id)?))
}

async fn list_workout_templates(
    State(state): State<SharedState>,
    Json(req): Json<QueryReq>,
) -> ApiResult<Vec<WorkoutTemplate>> {
    Ok(Json(workouts_service::list_workout_templates(&state.app, req.query)?))
}

async fn create_workout_template(
    State(state): State<SharedState>,
    Json(req): Json<TemplateReq>,
) -> ApiResult<WorkoutTemplate> {
    Ok(Json(workouts_service::create_workout_template(&state.app, req.template)?))
}

async fn update_workout_template(
    State(state): State<SharedState>,
    Json(req): Json<TemplateReq>,
) -> ApiResult<WorkoutTemplate> {
    Ok(Json(workouts_service::update_workout_template(&state.app, req.template)?))
}

async fn delete_workout_template(
    State(state): State<SharedState>,
    Json(req): Json<IdReq>,
) -> ApiResult<()> {
    Ok(Json(workouts_service::delete_workout_template(&state.app, req.id)?))
}

async fn list_routines(
    State(state): State<SharedState>,
    Json(req): Json<QueryReq>,
) -> ApiResult<Vec<Routine>> {
    Ok(Json(workouts_service::list_routines(&state.app, req.query)?))
}

async fn create_routine(
    State(state): State<SharedState>,
    Json(req): Json<CreateRoutineReq>,
) -> ApiResult<Routine> {
    Ok(Json(workouts_service::create_routine(
        &state.app,
        req.name,
        req.exercise_ids,
    )?))
}

async fn update_routine(
    State(state): State<SharedState>,
    Json(req): Json<UpdateRoutineReq>,
) -> ApiResult<Routine> {
    Ok(Json(workouts_service::update_routine(
        &state.app,
        req.id,
        req.name,
        req.exercise_ids,
    )?))
}

async fn delete_routine(
    State(state): State<SharedState>,
    Json(req): Json<IdReq>,
) -> ApiResult<()> {
    Ok(Json(workouts_service::delete_routine(&state.app, req.id)?))
}

async fn get_exercise_progress(
    State(state): State<SharedState>,
    Json(req): Json<ExerciseIdReq>,
) -> ApiResult<ExerciseProgress> {
    Ok(Json(workouts_service::get_exercise_progress(&state.app, req.exercise_id)?))
}

async fn add_exercise_log(
    State(state): State<SharedState>,
    Json(req): Json<AddExerciseLogReq>,
) -> ApiResult<ExerciseProgress> {
    Ok(Json(workouts_service::add_exercise_log(
        &state.app,
        req.exercise_id,
        req.input,
    )?))
}

async fn delete_exercise_log(
    State(state): State<SharedState>,
    Json(req): Json<LogIdReq>,
) -> ApiResult<()> {
    Ok(Json(workouts_service::delete_exercise_log(&state.app, req.log_id)?))
}

async fn get_routine_progress(
    State(state): State<SharedState>,
    Json(req): Json<RoutineIdReq>,
) -> ApiResult<RoutineProgress> {
    Ok(Json(workouts_service::get_routine_progress(&state.app, req.routine_id)?))
}

async fn add_routine_log(
    State(state): State<SharedState>,
    Json(req): Json<AddRoutineLogReq>,
) -> ApiResult<RoutineProgress> {
    Ok(Json(workouts_service::add_routine_log(
        &state.app,
        req.routine_id,
        req.day_date,
        req.entries,
    )?))
}

async fn delete_routine_log(
    State(state): State<SharedState>,
    Json(req): Json<LogIdReq>,
) -> ApiResult<()> {
    Ok(Json(workouts_service::delete_routine_log(&state.app, req.log_id)?))
}

async fn get_day(
    State(state): State<SharedState>,
    Json(req): Json<DateReq>,
) -> ApiResult<DayRecord> {
    Ok(Json(day_service::get_day(&state.app, req.date)?))
}

async fn list_days(
    State(state): State<SharedState>,
    Json(req): Json<RangeReq>,
) -> ApiResult<Vec<DayRecord>> {
    Ok(Json(day_service::list_days(&state.app, req.start, req.end)?))
}

async fn upsert_day(
    State(state): State<SharedState>,
    Json(req): Json<DayReq>,
) -> ApiResult<DayRecord> {
    Ok(Json(day_service::upsert_day(&state.app, req.day)?))
}

async fn list_food_entries(
    State(state): State<SharedState>,
    Json(req): Json<DateReq>,
) -> ApiResult<Vec<FoodEntry>> {
    Ok(Json(meals_service::list_food_entries(&state.app, req.date)?))
}

async fn add_food_entry(
    State(state): State<SharedState>,
    Json(req): Json<AddFoodEntryReq>,
) -> ApiResult<FoodEntry> {
    Ok(Json(meals_service::add_food_entry(
        &state.app,
        req.day_date,
        req.food_id,
        req.quantity,
        req.unit,
        req.calories,
    )?))
}

async fn update_food_entry(
    State(state): State<SharedState>,
    Json(req): Json<UpdateFoodEntryReq>,
) -> ApiResult<FoodEntry> {
    Ok(Json(meals_service::update_food_entry(
        &state.app,
        req.id,
        req.quantity,
        req.unit,
        req.calories,
    )?))
}

async fn delete_food_entry(
    State(state): State<SharedState>,
    Json(req): Json<IdReq>,
) -> ApiResult<()> {
    Ok(Json(meals_service::delete_food_entry(&state.app, req.id)?))
}

async fn estimate_meal(
    State(state): State<SharedState>,
    Json(req): Json<DescriptionReq>,
) -> ApiResult<MealEstimate> {
    Ok(Json(ai_service::estimate_meal(&state.app, req.description).await?))
}

async fn generate_progress_feedback(
    State(state): State<SharedState>,
    Json(req): Json<ProgressFeedbackReq>,
) -> ApiResult<ProgressFeedbackResponse> {
    Ok(Json(
        ai_service::generate_progress_feedback(&state.app, req.request).await?,
    ))
}

async fn log_estimated_meal(
    State(state): State<SharedState>,
    Json(req): Json<LogEstimatedMealReq>,
) -> ApiResult<FoodEntry> {
    Ok(Json(ai_service::log_estimated_meal(
        &state.app,
        req.day_date,
        req.estimate,
    )?))
}

async fn list_meal_estimate_api_logs(
    State(state): State<SharedState>,
    Json(req): Json<LimitReq>,
) -> ApiResult<Vec<MealEstimateApiLog>> {
    Ok(Json(ai_service::list_meal_estimate_api_logs(&state.app, req.limit)?))
}

async fn clear_meal_estimate_api_logs(State(state): State<SharedState>) -> ApiResult<()> {
    Ok(Json(ai_service::clear_meal_estimate_api_logs(&state.app)?))
}

async fn list_workouts(
    State(state): State<SharedState>,
    Json(req): Json<DateReq>,
) -> ApiResult<Vec<WorkoutEntry>> {
    Ok(Json(workouts_service::list_workouts(&state.app, req.date)?))
}

async fn add_workout(
    State(state): State<SharedState>,
    Json(req): Json<AddWorkoutReq>,
) -> ApiResult<WorkoutEntry> {
    Ok(Json(workouts_service::add_workout(
        &state.app,
        req.day_date,
        req.workout_type,
        req.duration_min,
        req.intensity,
        req.calories,
        req.calories_override,
    )?))
}

async fn update_workout(
    State(state): State<SharedState>,
    Json(req): Json<UpdateWorkoutReq>,
) -> ApiResult<WorkoutEntry> {
    Ok(Json(workouts_service::update_workout(
        &state.app,
        req.id,
        req.workout_type,
        req.duration_min,
        req.intensity,
        req.calories,
        req.calories_override,
    )?))
}

async fn delete_workout(
    State(state): State<SharedState>,
    Json(req): Json<IdReq>,
) -> ApiResult<()> {
    Ok(Json(workouts_service::delete_workout(&state.app, req.id)?))
}

async fn get_metrics_range(
    State(state): State<SharedState>,
    Json(req): Json<RangeReq>,
) -> ApiResult<Vec<MetricsPoint>> {
    Ok(Json(day_service::get_metrics_range(&state.app, req.start, req.end)?))
}

async fn get_period_summary(
    State(state): State<SharedState>,
    Json(req): Json<DaysReq>,
) -> ApiResult<PeriodSummary> {
    Ok(Json(day_service::get_period_summary(&state.app, req.days)?))
}

async fn get_latest_weight(
    State(state): State<SharedState>,
    Json(req): Json<BeforeDateReq>,
) -> ApiResult<Option<f64>> {
    Ok(Json(day_service::get_latest_weight(&state.app, req.before_date)?))
}

async fn export_backup(State(state): State<SharedState>) -> ApiResult<BackupData> {
    Ok(Json(backup_service::export_backup(&state.app)?))
}

async fn export_sync_snapshot(State(state): State<SharedState>) -> ApiResult<SyncSnapshot> {
    Ok(Json(sync_service::export_sync_snapshot(&state.app)?))
}

async fn import_backup(
    State(state): State<SharedState>,
    Json(req): Json<BackupReq>,
) -> ApiResult<()> {
    Ok(Json(backup_service::import_backup(&state.app, req.backup)?))
}

async fn import_sync_snapshot(
    State(state): State<SharedState>,
    Json(req): Json<SnapshotReq>,
) -> ApiResult<()> {
    Ok(Json(sync_service::import_sync_snapshot(&state.app, req.snapshot)?))
}

async fn get_sync_state(State(state): State<SharedState>) -> ApiResult<SyncState> {
    Ok(Json(sync_service::get_sync_state(&state.app)?))
}

async fn save_google_auth(
    State(state): State<SharedState>,
    Json(req): Json<SaveGoogleAuthReq>,
) -> ApiResult<()> {
    Ok(Json(sync_service::save_google_auth(
        &state.app,
        req.email,
        req.refresh_token,
    )?))
}

async fn clear_google_auth(State(state): State<SharedState>) -> ApiResult<()> {
    Ok(Json(sync_service::clear_google_auth(&state.app)?))
}

async fn get_google_refresh_token(
    State(state): State<SharedState>,
) -> ApiResult<Option<String>> {
    Ok(Json(sync_service::get_google_refresh_token(&state.app)?))
}

async fn mark_synced(
    State(state): State<SharedState>,
    Json(req): Json<MarkSyncedReq>,
) -> ApiResult<()> {
    Ok(Json(sync_service::mark_synced(&state.app, req.synced_at)?))
}

async fn sync_push(
    State(state): State<SharedState>,
    Json(req): Json<AccessTokenReq>,
) -> ApiResult<SyncSnapshot> {
    Ok(Json(sync_service::sync_push(&state.app, req.access_token)?))
}

async fn sync_pull(
    State(_state): State<SharedState>,
    Json(req): Json<AccessTokenReq>,
) -> ApiResult<SyncPullResult> {
    Ok(Json(sync_service::sync_pull(req.access_token)?))
}

/// All authenticated data endpoints, mirroring the Tauri command surface.
pub fn data_routes() -> Router<SharedState> {
    Router::new()
        .route("/get_settings", post(get_settings))
        .route("/update_settings", post(update_settings))
        .route("/get_food_last_eaten_dates", post(get_food_last_eaten_dates))
        .route("/list_foods", post(list_foods))
        .route("/create_food", post(create_food))
        .route("/update_food", post(update_food))
        .route("/delete_food", post(delete_food))
        .route("/list_workout_templates", post(list_workout_templates))
        .route("/create_workout_template", post(create_workout_template))
        .route("/update_workout_template", post(update_workout_template))
        .route("/delete_workout_template", post(delete_workout_template))
        .route("/list_routines", post(list_routines))
        .route("/create_routine", post(create_routine))
        .route("/update_routine", post(update_routine))
        .route("/delete_routine", post(delete_routine))
        .route("/get_exercise_progress", post(get_exercise_progress))
        .route("/add_exercise_log", post(add_exercise_log))
        .route("/delete_exercise_log", post(delete_exercise_log))
        .route("/get_routine_progress", post(get_routine_progress))
        .route("/add_routine_log", post(add_routine_log))
        .route("/delete_routine_log", post(delete_routine_log))
        .route("/get_day", post(get_day))
        .route("/list_days", post(list_days))
        .route("/upsert_day", post(upsert_day))
        .route("/list_food_entries", post(list_food_entries))
        .route("/add_food_entry", post(add_food_entry))
        .route("/update_food_entry", post(update_food_entry))
        .route("/delete_food_entry", post(delete_food_entry))
        .route("/estimate_meal", post(estimate_meal))
        .route("/generate_progress_feedback", post(generate_progress_feedback))
        .route("/log_estimated_meal", post(log_estimated_meal))
        .route("/list_meal_estimate_api_logs", post(list_meal_estimate_api_logs))
        .route("/clear_meal_estimate_api_logs", post(clear_meal_estimate_api_logs))
        .route("/list_workouts", post(list_workouts))
        .route("/add_workout", post(add_workout))
        .route("/update_workout", post(update_workout))
        .route("/delete_workout", post(delete_workout))
        .route("/get_metrics_range", post(get_metrics_range))
        .route("/get_period_summary", post(get_period_summary))
        .route("/get_latest_weight", post(get_latest_weight))
        .route("/export_backup", post(export_backup))
        .route("/export_sync_snapshot", post(export_sync_snapshot))
        .route("/import_backup", post(import_backup))
        .route("/import_sync_snapshot", post(import_sync_snapshot))
        .route("/get_sync_state", post(get_sync_state))
        .route("/save_google_auth", post(save_google_auth))
        .route("/clear_google_auth", post(clear_google_auth))
        .route("/get_google_refresh_token", post(get_google_refresh_token))
        .route("/mark_synced", post(mark_synced))
        .route("/sync_push", post(sync_push))
        .route("/sync_pull", post(sync_pull))
}
