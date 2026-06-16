use crate::app::meals_service;
use crate::app::models::{
    map_settings, resolve_ai_api_key, resolve_ai_model, FoodEntry, SETTINGS_SELECT,
};
use crate::day_totals;
use crate::db::AppState;
use crate::gemini;
use crate::meal_estimate::{self, MealEstimate};
use crate::progress_feedback::{self, ProgressFeedbackRequest, ProgressFeedbackResponse};
use rusqlite::params;

pub async fn estimate_meal(
    state: &AppState,
    description: String,
) -> Result<MealEstimate, String> {
    let trimmed = description.trim();
    if trimmed.is_empty() {
        return Err("Enter a meal description to estimate".to_string());
    }

    let (enabled, api_key, model) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let settings = db
            .query_row(SETTINGS_SELECT, [], map_settings)
            .map_err(|e| e.to_string())?;
        if !settings.ai_enabled || !settings.meal_estimate_enabled {
            return Err("Enable AI meal estimates in Settings".to_string());
        }
        let api_key = resolve_ai_api_key(&settings)
            .ok_or_else(|| "Add your Gemini API key in Settings".to_string())?;
        let model = resolve_ai_model(&settings);
        (settings.meal_estimate_enabled, api_key, model)
    };

    let _ = enabled;
    let normalized = meal_estimate::normalize_description(trimmed);

    if let Some(cached) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        meal_estimate::read_cache(&db, &normalized)?
    } {
        return Ok(cached);
    }

    let (estimate_result, api_logs) =
        meal_estimate::call_gemini(&api_key, &model, trimmed).await;

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        if !api_logs.is_empty() {
            meal_estimate::insert_api_logs(&db, &api_logs)?;
        }
    }

    let estimate = estimate_result?;

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        meal_estimate::write_cache(&db, &normalized, trimmed, &estimate)?;
    }

    Ok(estimate)
}

pub async fn generate_progress_feedback(
    state: &AppState,
    request: ProgressFeedbackRequest,
) -> Result<ProgressFeedbackResponse, String> {
    let topic = request.topic.clone();
    let (api_key, model, verbose) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let settings = db
            .query_row(SETTINGS_SELECT, [], map_settings)
            .map_err(|e| e.to_string())?;
        if !settings.ai_enabled || !settings.ai_feedback_enabled {
            return Err("Enable AI progress feedback in Settings".to_string());
        }
        let api_key = resolve_ai_api_key(&settings)
            .ok_or_else(|| "Add your Gemini API key in Settings".to_string())?;
        (api_key, resolve_ai_model(&settings), settings.ai_verbose_logging)
    };

    match progress_feedback::generate_feedback(&api_key, &model, request).await {
        Ok((response, call, prompt)) => {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            progress_feedback::log_feedback_call(
                &db, &topic, &model, verbose, &prompt, &call, None,
            )?;
            Ok(response)
        }
        Err(error) => {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            let empty_call = gemini::GeminiCallResult {
                response_text: String::new(),
                http_status: 0,
                prompt_tokens: None,
                output_tokens: None,
                total_tokens: None,
                duration_ms: 0,
            };
            let _ = progress_feedback::log_feedback_call(
                &db,
                &topic,
                &model,
                verbose,
                "",
                &empty_call,
                Some("error"),
            );
            Err(error)
        }
    }
}

pub fn list_meal_estimate_api_logs(
    state: &AppState,
    limit: Option<i32>,
) -> Result<Vec<meal_estimate::MealEstimateApiLog>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    meal_estimate::list_api_logs(&db, limit.unwrap_or(100))
}

pub fn clear_meal_estimate_api_logs(state: &AppState) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    meal_estimate::clear_api_logs(&db)
}

pub fn log_estimated_meal(
    state: &AppState,
    day_date: String,
    estimate: MealEstimate,
) -> Result<FoodEntry, String> {
    let estimate = meal_estimate::sanitize_estimate(estimate)?;
    let food_name = meal_estimate::estimated_food_name(&estimate.name);
    let calories = estimate.calories;

    let entry_id = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "INSERT INTO foods (name, reference_quantity, reference_unit, calories, protein, carbs, fat, fiber, salt, micronutrients)
             VALUES (?1, 1, 'serving', ?2, ?3, ?4, ?5, ?6, ?7, NULL)",
            params![
                food_name,
                calories,
                estimate.protein,
                estimate.carbs,
                estimate.fat,
                estimate.fiber,
                estimate.salt,
            ],
        )
        .map_err(|e| e.to_string())?;
        let food_id = db.last_insert_rowid();

        db.execute(
            "INSERT OR IGNORE INTO days (date) VALUES (?1)",
            [&day_date],
        )
        .map_err(|e| e.to_string())?;

        db.execute(
            "INSERT INTO food_entries (day_date, food_id, quantity, unit, calories) VALUES (?1, ?2, 1, 'serving', ?3)",
            params![day_date, food_id, calories],
        )
        .map_err(|e| e.to_string())?;
        let entry_id = db.last_insert_rowid();

        day_totals::recalc_day_food_totals(&db, &day_date).map_err(|e| e.to_string())?;
        entry_id
    };

    meals_service::list_food_entries(state, day_date)?
        .into_iter()
        .find(|e| e.id == entry_id)
        .ok_or_else(|| "Failed to load food entry".to_string())
}
