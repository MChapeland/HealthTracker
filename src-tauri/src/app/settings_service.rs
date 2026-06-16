use crate::app::models::{
    map_settings, normalize_accent_color, normalize_weight_change_unit, resolve_ai_model, Settings,
    SETTINGS_SELECT,
};
use crate::db::AppState;
use rusqlite::params;

pub fn get_settings(state: &AppState) -> Result<Settings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.query_row(SETTINGS_SELECT, [], map_settings)
        .map_err(|e| e.to_string())
}

pub fn update_settings(state: &AppState, mut settings: Settings) -> Result<(), String> {
    settings.workout_days_per_week = settings.workout_days_per_week.clamp(1, 7);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    if settings
        .ai_api_key
        .as_ref()
        .is_some_and(|key| key.trim().is_empty())
    {
        settings.ai_api_key = db
            .query_row(
                "SELECT COALESCE(ai_api_key, meal_estimate_api_key) FROM settings WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
    } else if let Some(key) = settings.ai_api_key.as_mut() {
        *key = key.trim().to_string();
        if key.is_empty() {
            settings.ai_api_key = None;
        }
    }
    settings.ai_model = resolve_ai_model(&settings);
    settings.meal_estimate_model = settings.ai_model.clone();
    if let Some(key) = settings.ai_api_key.clone() {
        settings.meal_estimate_api_key = Some(key);
    }
    db.execute(
        "UPDATE settings SET
            starting_weight = ?1, target_weight = ?2, step_length_m = ?3, speed_kmh = ?4,
            steps_per_km = ?5, daily_steps_goal = ?6, calorie_ideal_min = ?7, calorie_ideal_max = ?8,
            calorie_warning = ?9, calorie_max = ?10, score_weight_calories = ?11,
            score_weight_walking = ?12, score_weight_workout = ?13, score_weight_trend = ?14,
            score_good_threshold = ?15, score_okay_threshold = ?16, onboarding_complete = ?17,
            journey_start_date = ?18, height_cm = ?19, birth_date = ?20, sex = ?21, activity_level = ?22,
            macro_goal_carbs = ?23, macro_goal_fat = ?24, macro_goal_protein = ?25,
            macro_goal_fiber = ?26, macro_goal_salt = ?27,
            score_weight_food_kcal = ?28, score_weight_food_macros = ?29,
            calorie_warning_below = ?30, target_monthly_weight_change_kg = ?31,
            target_weight_change_unit = ?32, workouts_per_week = ?33, accent_color = ?34,
            meal_estimate_enabled = ?35, meal_estimate_api_key = ?36, meal_estimate_model = ?37,
            daily_water_goal_ml = ?38,
            daily_teeth_brushings_goal = ?39, score_weight_teeth = ?40,
            ai_enabled = ?41, ai_api_key = ?42, ai_model = ?43,
            ai_feedback_enabled = ?44, ai_verbose_logging = ?45
         WHERE id = 1",
        params![
            settings.starting_weight,
            settings.target_weight,
            settings.step_length_m,
            settings.speed_kmh,
            settings.steps_per_km,
            settings.daily_steps_goal,
            settings.calorie_ideal_min,
            settings.calorie_ideal_max,
            settings.calorie_warning,
            settings.calorie_max,
            settings.score_weight_calories,
            settings.score_weight_walking,
            settings.score_weight_workout,
            settings.score_weight_trend,
            settings.score_good_threshold,
            settings.score_okay_threshold,
            if settings.onboarding_complete { 1 } else { 0 },
            settings.journey_start_date,
            settings.height_cm,
            settings.birth_date,
            settings.sex,
            settings.activity_level,
            settings.macro_goal_carbs,
            settings.macro_goal_fat,
            settings.macro_goal_protein,
            settings.macro_goal_fiber,
            settings.macro_goal_salt,
            settings.score_weight_food_kcal,
            settings.score_weight_food_macros,
            settings.calorie_warning_below,
            settings.target_monthly_weight_change_kg,
            normalize_weight_change_unit(&settings.target_weight_change_unit),
            settings.workout_days_per_week,
            normalize_accent_color(&settings.accent_color),
            if settings.meal_estimate_enabled { 1 } else { 0 },
            settings.meal_estimate_api_key,
            settings.meal_estimate_model,
            settings.daily_water_goal_ml,
            settings.daily_teeth_brushings_goal,
            settings.score_weight_teeth,
            if settings.ai_enabled { 1 } else { 0 },
            settings.ai_api_key,
            settings.ai_model,
            if settings.ai_feedback_enabled { 1 } else { 0 },
            if settings.ai_verbose_logging { 1 } else { 0 },
        ],
    )
    .map_err(|e| e.to_string())?;
    crate::db::touch_local_modified(&db)?;
    Ok(())
}
