use crate::db::AppState;
use crate::day_totals;
use crate::day_workouts;
use crate::meal_estimate::{self, MealEstimate};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub starting_weight: Option<f64>,
    pub target_weight: Option<f64>,
    pub target_monthly_weight_change_kg: Option<f64>,
    pub target_weight_change_unit: String,
    pub step_length_m: f64,
    pub speed_kmh: f64,
    pub steps_per_km: Option<f64>,
    pub daily_steps_goal: i64,
    pub workout_days_per_week: i64,
    pub calorie_ideal_min: i64,
    pub calorie_ideal_max: i64,
    pub calorie_warning_below: i64,
    pub calorie_warning: i64,
    pub calorie_max: i64,
    pub score_weight_calories: i64,
    pub score_weight_walking: i64,
    pub score_weight_workout: i64,
    pub score_weight_trend: i64,
    pub score_good_threshold: i64,
    pub score_okay_threshold: i64,
    pub onboarding_complete: bool,
    pub journey_start_date: Option<String>,
    pub height_cm: Option<f64>,
    pub birth_date: Option<String>,
    pub sex: Option<String>,
    pub activity_level: Option<String>,
    pub macro_goal_carbs: Option<f64>,
    pub macro_goal_fat: Option<f64>,
    pub macro_goal_protein: Option<f64>,
    pub macro_goal_fiber: Option<f64>,
    pub macro_goal_salt: Option<f64>,
    pub score_weight_food_kcal: i64,
    pub score_weight_food_macros: i64,
    pub accent_color: String,
    pub meal_estimate_enabled: bool,
    pub meal_estimate_api_key: Option<String>,
    pub meal_estimate_model: String,
    #[serde(default = "default_daily_water_goal_ml")]
    pub daily_water_goal_ml: i64,
    #[serde(default = "default_daily_teeth_brushings_goal")]
    pub daily_teeth_brushings_goal: i64,
    #[serde(default = "default_score_weight_teeth")]
    pub score_weight_teeth: i64,
}

fn default_daily_water_goal_ml() -> i64 {
    2000
}

fn default_daily_teeth_brushings_goal() -> i64 {
    2
}

fn default_score_weight_teeth() -> i64 {
    10
}

fn normalize_weight_change_unit(unit: &str) -> String {
    match unit.trim() {
        "day" | "week" | "month" | "year" => unit.trim().to_string(),
        _ => "month".to_string(),
    }
}

fn normalize_accent_color(color: &str) -> String {
    match color.trim() {
        "emerald" | "blue" | "violet" | "rose" | "amber" | "grey" => {
            color.trim().to_string()
        }
        _ => "blue".to_string(),
    }
}

fn normalize_meal_estimate_model(model: &str) -> String {
    meal_estimate::normalize_meal_estimate_model(model)
}

pub(crate) const SETTINGS_SELECT: &str = "SELECT starting_weight, target_weight, step_length_m, speed_kmh, steps_per_km,
                daily_steps_goal, calorie_ideal_min, calorie_ideal_max, calorie_warning, calorie_max,
                score_weight_calories, score_weight_walking, score_weight_workout, score_weight_trend,
                score_good_threshold, score_okay_threshold, onboarding_complete, journey_start_date,
                height_cm, birth_date, sex, activity_level,
                macro_goal_carbs, macro_goal_fat, macro_goal_protein, macro_goal_fiber, macro_goal_salt,
                score_weight_food_kcal, score_weight_food_macros, calorie_warning_below,
                target_monthly_weight_change_kg, target_weight_change_unit, workouts_per_week, accent_color,
                meal_estimate_enabled, meal_estimate_api_key, meal_estimate_model,
                daily_water_goal_ml, daily_teeth_brushings_goal, score_weight_teeth
         FROM settings WHERE id = 1";

pub(crate) const DAY_SELECT: &str = "SELECT date, weight, walking_primary, steps, distance_km, duration_min,
                worked_out, workout_duration_min, workout_intensity, workout_calories,
                workout_calories_override, notes, daily_score, total_calories,
                total_carbs, total_fat, total_protein, total_fiber, total_salt, water_ml,
                teeth_brushings
         FROM days";

fn journey_start_from_db(db: &rusqlite::Connection) -> Result<Option<String>, String> {
    db.query_row(
        "SELECT journey_start_date FROM settings WHERE id = 1",
        [],
        |r| r.get(0),
    )
    .map_err(|e| e.to_string())
}

fn clamp_range_start(requested: &str, journey: &Option<String>) -> String {
    if let Some(js) = journey.as_ref().filter(|s| !s.is_empty()) {
        if requested < js.as_str() {
            return js.clone();
        }
    }
    requested.to_string()
}

fn is_before_journey(date: &str, journey: &Option<String>) -> bool {
    journey
        .as_ref()
        .filter(|s| !s.is_empty())
        .is_some_and(|js| date < js.as_str())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Food {
    pub id: i64,
    pub name: String,
    pub reference_quantity: f64,
    pub reference_unit: String,
    pub calories: f64,
    pub protein: Option<f64>,
    pub carbs: Option<f64>,
    pub fat: Option<f64>,
    pub fiber: Option<f64>,
    pub salt: Option<f64>,
    pub micronutrients: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FoodEntry {
    pub id: i64,
    pub day_date: String,
    pub food_id: i64,
    pub food_name: String,
    pub quantity: f64,
    pub unit: String,
    pub calories: f64,
    pub reference_quantity: f64,
    pub protein: Option<f64>,
    pub carbs: Option<f64>,
    pub fat: Option<f64>,
    pub fiber: Option<f64>,
    pub salt: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutTemplate {
    pub id: i64,
    pub name: String,
    pub amount: f64,
    pub amount_unit: String,
    pub calories: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineExerciseItem {
    pub id: i64,
    pub exercise_id: i64,
    pub name: String,
    pub amount: f64,
    pub amount_unit: String,
    pub calories: f64,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Routine {
    pub id: i64,
    pub name: String,
    pub created_at: String,
    pub exercises: Vec<RoutineExerciseItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutEntry {
    pub id: i64,
    pub day_date: String,
    pub workout_type: String,
    pub duration_min: i64,
    pub intensity: String,
    pub calories: Option<f64>,
    pub calories_override: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DayRecord {
    pub date: String,
    pub weight: Option<f64>,
    pub walking_primary: Option<String>,
    pub steps: Option<i64>,
    pub distance_km: Option<f64>,
    pub duration_min: Option<f64>,
    pub worked_out: bool,
    pub workout_duration_min: Option<i64>,
    pub workout_intensity: Option<String>,
    pub workout_calories: Option<f64>,
    pub workout_calories_override: bool,
    pub notes: Option<String>,
    pub daily_score: Option<String>,
    pub total_calories: f64,
    pub total_carbs: Option<f64>,
    pub total_fat: Option<f64>,
    pub total_protein: Option<f64>,
    pub total_fiber: Option<f64>,
    pub total_salt: Option<f64>,
    #[serde(default)]
    pub water_ml: Option<i64>,
    #[serde(default)]
    pub teeth_brushings: Option<i64>,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DayInput {
    pub date: String,
    pub weight: Option<f64>,
    pub walking_primary: Option<String>,
    pub steps: Option<i64>,
    pub distance_km: Option<f64>,
    pub duration_min: Option<f64>,
    pub worked_out: bool,
    pub workout_duration_min: Option<i64>,
    pub workout_intensity: Option<String>,
    pub workout_calories: Option<f64>,
    pub workout_calories_override: bool,
    pub notes: Option<String>,
    pub daily_score: Option<String>,
    pub total_calories: f64,
    pub water_ml: Option<i64>,
    pub teeth_brushings: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricsPoint {
    pub date: String,
    pub weight: Option<f64>,
    pub total_calories: f64,
    pub steps: Option<i64>,
    pub distance_km: Option<f64>,
    pub duration_min: Option<f64>,
    pub worked_out: bool,
    pub workout_duration_min: Option<i64>,
    pub workout_intensity: Option<String>,
    pub workout_calories: Option<f64>,
    pub workout_calories_override: bool,
    pub daily_score: Option<String>,
    #[serde(default)]
    pub water_ml: Option<i64>,
    #[serde(default)]
    pub teeth_brushings: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeriodSummary {
    pub days_logged: i64,
    pub avg_calories: Option<f64>,
    pub workout_count: i64,
    pub good_day_percent: Option<f64>,
    pub avg_steps: Option<f64>,
    pub avg_water_ml: Option<f64>,
    pub total_calories: Option<f64>,
    pub weight_log_days: i64,
    pub avg_distance_km: Option<f64>,
    pub okay_day_percent: Option<f64>,
    pub weight_lost_kg: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupData {
    pub settings: Settings,
    pub foods: Vec<Food>,
    #[serde(default)]
    pub workout_templates: Vec<WorkoutTemplate>,
    #[serde(default)]
    pub routines: Vec<Routine>,
    pub days: Vec<DayRecord>,
    pub food_entries: Vec<FoodEntry>,
    #[serde(default)]
    pub day_workouts: Vec<WorkoutEntry>,
    #[serde(default)]
    pub exercise_logs: Vec<crate::exercise_progress::ExerciseLog>,
    #[serde(default)]
    pub routine_log_sessions: Vec<crate::exercise_progress::RoutineLogSession>,
}

pub(crate) fn map_settings(row: &rusqlite::Row) -> rusqlite::Result<Settings> {
    Ok(Settings {
        starting_weight: row.get(0)?,
        target_weight: row.get(1)?,
        step_length_m: row.get(2)?,
        speed_kmh: row.get(3)?,
        steps_per_km: row.get(4)?,
        daily_steps_goal: row.get(5)?,
        calorie_ideal_min: row.get(6)?,
        calorie_ideal_max: row.get(7)?,
        calorie_warning: row.get(8)?,
        calorie_max: row.get(9)?,
        score_weight_calories: row.get(10)?,
        score_weight_walking: row.get(11)?,
        score_weight_workout: row.get(12)?,
        score_weight_trend: row.get(13)?,
        score_good_threshold: row.get(14)?,
        score_okay_threshold: row.get(15)?,
        onboarding_complete: row.get::<_, i64>(16)? != 0,
        journey_start_date: row.get(17)?,
        height_cm: row.get(18)?,
        birth_date: row.get(19)?,
        sex: row.get(20)?,
        activity_level: row.get(21)?,
        macro_goal_carbs: row.get(22)?,
        macro_goal_fat: row.get(23)?,
        macro_goal_protein: row.get(24)?,
        macro_goal_fiber: row.get(25)?,
        macro_goal_salt: row.get(26)?,
        score_weight_food_kcal: row.get(27)?,
        score_weight_food_macros: row.get(28)?,
        calorie_warning_below: row.get(29)?,
        target_monthly_weight_change_kg: row.get(30)?,
        target_weight_change_unit: normalize_weight_change_unit(&row.get::<_, String>(31)?),
        workout_days_per_week: row.get::<_, i64>(32)?.clamp(1, 7),
        accent_color: normalize_accent_color(&row.get::<_, String>(33)?),
        meal_estimate_enabled: row.get::<_, i64>(34)? != 0,
        meal_estimate_api_key: row.get(35)?,
        meal_estimate_model: normalize_meal_estimate_model(&row.get::<_, String>(36)?),
        daily_water_goal_ml: row.get(37)?,
        daily_teeth_brushings_goal: row.get(38)?,
        score_weight_teeth: row.get(39)?,
    })
}

pub(crate) fn map_food(row: &rusqlite::Row) -> rusqlite::Result<Food> {
    Ok(Food {
        id: row.get(0)?,
        name: row.get(1)?,
        reference_quantity: row.get(2)?,
        reference_unit: row.get(3)?,
        calories: row.get(4)?,
        protein: row.get(5)?,
        carbs: row.get(6)?,
        fat: row.get(7)?,
        fiber: row.get(8)?,
        micronutrients: row.get(9)?,
        salt: row.get(10)?,
    })
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<Settings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.query_row(SETTINGS_SELECT, [], map_settings)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(state: State<AppState>, mut settings: Settings) -> Result<(), String> {
    settings.workout_days_per_week = settings.workout_days_per_week.clamp(1, 7);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    if settings
        .meal_estimate_api_key
        .as_ref()
        .is_some_and(|key| key.trim().is_empty())
    {
        settings.meal_estimate_api_key = db
            .query_row(
                "SELECT meal_estimate_api_key FROM settings WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
    } else if let Some(key) = settings.meal_estimate_api_key.as_mut() {
        *key = key.trim().to_string();
        if key.is_empty() {
            settings.meal_estimate_api_key = None;
        }
    }
    settings.meal_estimate_model = normalize_meal_estimate_model(&settings.meal_estimate_model);
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
            daily_teeth_brushings_goal = ?39, score_weight_teeth = ?40
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
            normalize_meal_estimate_model(&settings.meal_estimate_model),
            settings.daily_water_goal_ml,
            settings.daily_teeth_brushings_goal,
            settings.score_weight_teeth,
        ],
    )
    .map_err(|e| e.to_string())?;
    crate::db::touch_local_modified(&db)?;
    Ok(())
}

#[tauri::command]
pub fn get_food_last_eaten_dates(
    state: State<AppState>,
) -> Result<std::collections::HashMap<i64, String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT food_id, MAX(day_date) FROM food_entries GROUP BY food_id")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<std::collections::HashMap<_, _>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_foods(state: State<AppState>, query: Option<String>) -> Result<Vec<Food>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(q) = query.filter(|s| !s.is_empty()) {
        let pattern = format!("%{}%", q);
        let mut stmt = db
            .prepare(
                "SELECT id, name, reference_quantity, reference_unit, calories, protein, carbs, fat, fiber, micronutrients, salt
                 FROM foods WHERE name LIKE ?1 ORDER BY name ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([&pattern], map_food)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    } else {
        let mut stmt = db
            .prepare(
                "SELECT id, name, reference_quantity, reference_unit, calories, protein, carbs, fat, fiber, micronutrients, salt
                 FROM foods ORDER BY name ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], map_food)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn create_food(state: State<AppState>, food: Food) -> Result<Food, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO foods (name, reference_quantity, reference_unit, calories, protein, carbs, fat, fiber, salt, micronutrients)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            food.name,
            food.reference_quantity,
            food.reference_unit,
            food.calories,
            food.protein,
            food.carbs,
            food.fat,
            food.fiber,
            food.salt,
            food.micronutrients,
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();
    Ok(Food { id, ..food })
}

#[tauri::command]
pub fn update_food(state: State<AppState>, food: Food) -> Result<Food, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE foods SET name=?1, reference_quantity=?2, reference_unit=?3, calories=?4,
         protein=?5, carbs=?6, fat=?7, fiber=?8, salt=?9, micronutrients=?10 WHERE id=?11",
        params![
            food.name,
            food.reference_quantity,
            food.reference_unit,
            food.calories,
            food.protein,
            food.carbs,
            food.fat,
            food.fiber,
            food.salt,
            food.micronutrients,
            food.id,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(food)
}

#[tauri::command]
pub fn delete_food(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM food_entries WHERE food_id = ?1",
            [id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if count > 0 {
        return Err(format!("Food is used in {} entries. Delete those first.", count));
    }
    db.execute("DELETE FROM foods WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn normalize_workout_amount_unit(unit: &str) -> Result<String, String> {
    match unit.trim().to_lowercase().as_str() {
        "reps" | "rep" | "rep(s)" => Ok("reps".to_string()),
        "mins" | "minutes" | "minute" | "minute(s)" | "min" => Ok("mins".to_string()),
        "hrs" | "hours" | "hour" | "hour(s)" | "hr" => Ok("hrs".to_string()),
        "km" => Ok("km".to_string()),
        _ => Err("Unit must be reps, mins, hrs, or km".to_string()),
    }
}

pub(crate) fn map_workout_template(row: &rusqlite::Row) -> rusqlite::Result<WorkoutTemplate> {
    let raw_unit: String = row.get(3)?;
    let amount_unit = normalize_workout_amount_unit(&raw_unit).unwrap_or(raw_unit);
    Ok(WorkoutTemplate {
        id: row.get(0)?,
        name: row.get(1)?,
        amount: row.get(2)?,
        amount_unit,
        calories: row.get(4)?,
        created_at: row.get(5)?,
    })
}

pub(crate) fn fetch_workout_template(
    db: &rusqlite::Connection,
    id: i64,
) -> Result<WorkoutTemplate, String> {
    db.query_row(
        "SELECT id, name, amount, amount_unit, calories, created_at
         FROM workout_templates WHERE id = ?1",
        [id],
        map_workout_template,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_workout_templates(
    state: State<AppState>,
    query: Option<String>,
) -> Result<Vec<WorkoutTemplate>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(q) = query.filter(|s| !s.is_empty()) {
        let pattern = format!("%{}%", q);
        let mut stmt = db
            .prepare(
                "SELECT id, name, amount, amount_unit, calories, created_at
                 FROM workout_templates WHERE name LIKE ?1 ORDER BY name ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([&pattern], map_workout_template)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    } else {
        let mut stmt = db
            .prepare(
                "SELECT id, name, amount, amount_unit, calories, created_at
                 FROM workout_templates ORDER BY name ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], map_workout_template)
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn create_workout_template(
    state: State<AppState>,
    template: WorkoutTemplate,
) -> Result<WorkoutTemplate, String> {
    let name = template.name.trim();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let unit = normalize_workout_amount_unit(&template.amount_unit)?;
    if template.amount <= 0.0 {
        return Err("Amount must be greater than zero".to_string());
    }
    if template.calories < 0.0 {
        return Err("Calories cannot be negative".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO workout_templates (name, amount, amount_unit, calories)
         VALUES (?1, ?2, ?3, ?4)",
        params![name, template.amount, unit, template.calories],
    )
    .map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();
    fetch_workout_template(&db, id)
}

#[tauri::command]
pub fn update_workout_template(
    state: State<AppState>,
    template: WorkoutTemplate,
) -> Result<WorkoutTemplate, String> {
    let name = template.name.trim();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let unit = normalize_workout_amount_unit(&template.amount_unit)?;
    if template.amount <= 0.0 {
        return Err("Amount must be greater than zero".to_string());
    }
    if template.calories < 0.0 {
        return Err("Calories cannot be negative".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE workout_templates SET name=?1, amount=?2, amount_unit=?3, calories=?4 WHERE id=?5",
        params![name, template.amount, unit, template.calories, template.id],
    )
    .map_err(|e| e.to_string())?;
    fetch_workout_template(&db, template.id)
}

#[tauri::command]
pub fn delete_workout_template(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let in_routines: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM routine_exercises WHERE exercise_id = ?1",
            [id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if in_routines > 0 {
        return Err(
            "Cannot delete an exercise that is used in a routine. Remove it from routines first."
                .to_string(),
        );
    }
    db.execute("DELETE FROM workout_templates WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn load_routine_exercises(
    db: &rusqlite::Connection,
    routine_id: i64,
) -> Result<Vec<RoutineExerciseItem>, String> {
    let mut stmt = db
        .prepare(
            "SELECT re.id, re.exercise_id, re.sort_order,
                    wt.name, wt.amount, wt.amount_unit, wt.calories
             FROM routine_exercises re
             INNER JOIN workout_templates wt ON wt.id = re.exercise_id
             WHERE re.routine_id = ?1
             ORDER BY re.sort_order ASC, re.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([routine_id], |row| {
            let raw_unit: String = row.get(5)?;
            let amount_unit =
                normalize_workout_amount_unit(&raw_unit).unwrap_or(raw_unit);
            Ok(RoutineExerciseItem {
                id: row.get(0)?,
                exercise_id: row.get(1)?,
                sort_order: row.get(2)?,
                name: row.get(3)?,
                amount: row.get(4)?,
                amount_unit,
                calories: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn save_routine_exercises(
    db: &rusqlite::Connection,
    routine_id: i64,
    exercise_ids: &[i64],
) -> Result<(), String> {
    if exercise_ids.is_empty() {
        return Err("Add at least one exercise to the routine".to_string());
    }
    let mut seen = std::collections::HashSet::new();
    for &id in exercise_ids {
        if !seen.insert(id) {
            return Err("Each exercise can only appear once in a routine".to_string());
        }
        let exists: i64 = db
            .query_row(
                "SELECT COUNT(*) FROM workout_templates WHERE id = ?1",
                [id],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if exists == 0 {
            return Err("One or more exercises no longer exist".to_string());
        }
    }
    db.execute(
        "DELETE FROM routine_exercises WHERE routine_id = ?1",
        [routine_id],
    )
    .map_err(|e| e.to_string())?;
    for (sort_order, exercise_id) in exercise_ids.iter().enumerate() {
        db.execute(
            "INSERT INTO routine_exercises (routine_id, exercise_id, sort_order)
             VALUES (?1, ?2, ?3)",
            params![routine_id, exercise_id, sort_order as i64],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub(crate) fn fetch_routine(db: &rusqlite::Connection, id: i64) -> Result<Routine, String> {
    let (name, created_at): (String, String) = db
        .query_row(
            "SELECT name, created_at FROM routines WHERE id = ?1",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    let exercises = load_routine_exercises(db, id)?;
    Ok(Routine {
        id,
        name,
        created_at,
        exercises,
    })
}

#[tauri::command]
pub fn list_routines(
    state: State<AppState>,
    query: Option<String>,
) -> Result<Vec<Routine>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let routine_rows: Vec<(i64, String, String)> = if let Some(q) = query.filter(|s| !s.is_empty())
    {
        let pattern = format!("%{}%", q);
        let mut stmt = db
            .prepare(
                "SELECT id, name, created_at FROM routines WHERE name LIKE ?1 ORDER BY name ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([&pattern], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    } else {
        let mut stmt = db
            .prepare("SELECT id, name, created_at FROM routines ORDER BY name ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    let mut routines = Vec::with_capacity(routine_rows.len());
    for (id, name, created_at) in routine_rows {
        let exercises = load_routine_exercises(&db, id)?;
        routines.push(Routine {
            id,
            name,
            created_at,
            exercises,
        });
    }
    Ok(routines)
}

#[tauri::command]
pub fn create_routine(
    state: State<AppState>,
    name: String,
    exercise_ids: Vec<i64>,
) -> Result<Routine, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO routines (name) VALUES (?1)", params![name])
        .map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();
    save_routine_exercises(&db, id, &exercise_ids)?;
    fetch_routine(&db, id)
}

#[tauri::command]
pub fn update_routine(
    state: State<AppState>,
    id: i64,
    name: String,
    exercise_ids: Vec<i64>,
) -> Result<Routine, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let updated = db
        .execute("UPDATE routines SET name = ?1 WHERE id = ?2", params![name, id])
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Routine not found".to_string());
    }
    save_routine_exercises(&db, id, &exercise_ids)?;
    fetch_routine(&db, id)
}

#[tauri::command]
pub fn delete_routine(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM routines WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn map_day(row: &rusqlite::Row) -> rusqlite::Result<DayRecord> {
    let mut day = DayRecord {
        date: row.get(0)?,
        weight: row.get(1)?,
        walking_primary: row.get(2)?,
        steps: row.get(3)?,
        distance_km: row.get(4)?,
        duration_min: row.get(5)?,
        worked_out: row.get::<_, i64>(6)? != 0,
        workout_duration_min: row.get(7)?,
        workout_intensity: row.get(8)?,
        workout_calories: row.get(9)?,
        workout_calories_override: row.get::<_, i64>(10)? != 0,
        notes: row.get(11)?,
        daily_score: row.get(12)?,
        total_calories: row.get(13)?,
        total_carbs: row.get(14)?,
        total_fat: row.get(15)?,
        total_protein: row.get(16)?,
        total_fiber: row.get(17)?,
        total_salt: row.get(18)?,
        water_ml: row.get(19)?,
        teeth_brushings: row.get(20)?,
        exists: true,
    };
    apply_workout_rules(&mut day);
    Ok(day)
}

fn empty_day(date: &str) -> DayRecord {
    DayRecord {
        date: date.to_string(),
        weight: None,
        walking_primary: None,
        steps: None,
        distance_km: None,
        duration_min: None,
        worked_out: false,
        workout_duration_min: None,
        workout_intensity: Some("medium".to_string()),
        workout_calories: None,
        workout_calories_override: false,
        notes: None,
        daily_score: None,
        total_calories: 0.0,
        total_carbs: None,
        total_fat: None,
        total_protein: None,
        total_fiber: None,
        total_salt: None,
        water_ml: None,
        teeth_brushings: None,
        exists: false,
    }
}

#[tauri::command]
pub fn get_day(state: State<AppState>, date: String) -> Result<DayRecord, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let journey = journey_start_from_db(&db)?;
    if is_before_journey(&date, &journey) {
        return Ok(empty_day(&date));
    }
    let result = db
        .query_row(
            &format!("{DAY_SELECT} WHERE date = ?1"),
            [&date],
            map_day,
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(result.unwrap_or_else(|| empty_day(&date)))
}

#[tauri::command]
pub fn list_days(state: State<AppState>, start: String, end: String) -> Result<Vec<DayRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let journey = journey_start_from_db(&db)?;
    let start = clamp_range_start(&start, &journey);
    if end < start {
        return Ok(vec![]);
    }
    let mut stmt = db
        .prepare(
            &format!("{DAY_SELECT} WHERE date >= ?1 AND date <= ?2 ORDER BY date DESC"),
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start, end], map_day)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn normalize_workout_intensity(intensity: &Option<String>) -> String {
    match intensity.as_deref() {
        Some("low") => "low".to_string(),
        Some("medium") => "medium".to_string(),
        Some("high") => "high".to_string(),
        _ => "medium".to_string(),
    }
}

fn normalize_workout_type(workout_type: &Option<String>) -> String {
    match workout_type.as_deref() {
        Some("gym") => "gym".to_string(),
        Some("run") => "run".to_string(),
        Some("cycle") => "cycle".to_string(),
        Some("swim") => "swim".to_string(),
        Some("yoga") => "yoga".to_string(),
        Some("hiit") => "hiit".to_string(),
        Some("sports") => "sports".to_string(),
        Some("other") => "other".to_string(),
        _ => "gym".to_string(),
    }
}

fn workout_is_valid(duration_min: Option<i64>) -> bool {
    duration_min.is_some_and(|m| m > 0)
}

fn apply_workout_rules(day: &mut DayRecord) {
    day.workout_intensity = Some(normalize_workout_intensity(&day.workout_intensity));
    day.worked_out = workout_is_valid(day.workout_duration_min);
}

#[tauri::command]
pub fn upsert_day(state: State<AppState>, day: DayInput) -> Result<DayRecord, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let journey = journey_start_from_db(&db)?;
    if is_before_journey(&day.date, &journey) {
        return Err("This date is before your journey start date.".to_string());
    }
    db.execute(
        "INSERT INTO days (date, weight, walking_primary, steps, distance_km, duration_min,
            notes, daily_score, total_calories, water_ml, teeth_brushings, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,datetime('now'))
         ON CONFLICT(date) DO UPDATE SET
            weight=?2, walking_primary=?3, steps=?4, distance_km=?5, duration_min=?6,
            notes=?7, daily_score=?8, total_calories=?9, water_ml=?10, teeth_brushings=?11,
            updated_at=datetime('now')",
        params![
            day.date,
            day.weight,
            day.walking_primary,
            day.steps,
            day.distance_km,
            day.duration_min,
            day.notes,
            day.daily_score,
            day.total_calories,
            day.water_ml,
            day.teeth_brushings,
        ],
    )
    .map_err(|e| e.to_string())?;
    let date = day.date.clone();
    drop(db);
    get_day(state, date)
}

#[tauri::command]
pub fn list_food_entries(state: State<AppState>, date: String) -> Result<Vec<FoodEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT fe.id, fe.day_date, fe.food_id, f.name, fe.quantity, fe.unit, fe.calories,
                    f.reference_quantity, f.protein, f.carbs, f.fat, f.fiber, f.salt
             FROM food_entries fe
             JOIN foods f ON f.id = fe.food_id
             WHERE fe.day_date = ?1
             ORDER BY fe.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&date], |row| {
            Ok(FoodEntry {
                id: row.get(0)?,
                day_date: row.get(1)?,
                food_id: row.get(2)?,
                food_name: row.get(3)?,
                quantity: row.get(4)?,
                unit: row.get(5)?,
                calories: row.get(6)?,
                reference_quantity: row.get(7)?,
                protein: row.get(8)?,
                carbs: row.get(9)?,
                fat: row.get(10)?,
                fiber: row.get(11)?,
                salt: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
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
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR IGNORE INTO days (date) VALUES (?1)",
        [&day_date],
    )
    .map_err(|e| e.to_string())?;

    let existing: Option<(i64, f64, f64)> = db
        .query_row(
            "SELECT id, quantity, calories FROM food_entries
             WHERE day_date = ?1 AND food_id = ?2
             ORDER BY id ASC LIMIT 1",
            params![day_date, food_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let id = if let Some((existing_id, existing_qty, existing_cal)) = existing {
        let merged_qty = existing_qty + quantity;
        let merged_cal = existing_cal + calories;
        db.execute(
            "UPDATE food_entries SET quantity = ?1, unit = ?2, calories = ?3 WHERE id = ?4",
            params![merged_qty, unit, merged_cal, existing_id],
        )
        .map_err(|e| e.to_string())?;
        existing_id
    } else {
        db.execute(
            "INSERT INTO food_entries (day_date, food_id, quantity, unit, calories) VALUES (?1,?2,?3,?4,?5)",
            params![day_date, food_id, quantity, unit, calories],
        )
        .map_err(|e| e.to_string())?;
        db.last_insert_rowid()
    };

    day_totals::recalc_day_food_totals(&db, &day_date).map_err(|e| e.to_string())?;
    drop(db);
    list_food_entries(state, day_date)?
        .into_iter()
        .find(|e| e.id == id)
        .ok_or_else(|| "Failed to load food entry".to_string())
}

#[tauri::command]
pub fn update_food_entry(
    state: State<AppState>,
    id: i64,
    quantity: f64,
    unit: String,
    calories: f64,
) -> Result<FoodEntry, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let day_date: String = db
        .query_row("SELECT day_date FROM food_entries WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE food_entries SET quantity=?1, unit=?2, calories=?3 WHERE id=?4",
        params![quantity, unit, calories, id],
    )
    .map_err(|e| e.to_string())?;
    day_totals::recalc_day_food_totals(&db, &day_date).map_err(|e| e.to_string())?;
    drop(db);
    list_food_entries(state, day_date)?
        .into_iter()
        .find(|e| e.id == id)
        .ok_or_else(|| "Entry not found".to_string())
}

#[tauri::command]
pub fn delete_food_entry(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let day_date: String = db
        .query_row("SELECT day_date FROM food_entries WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    db.execute("DELETE FROM food_entries WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    day_totals::recalc_day_food_totals(&db, &day_date).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn estimate_meal(
    state: State<'_, AppState>,
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
        if !settings.meal_estimate_enabled {
            return Err("Enable AI meal estimates in Settings".to_string());
        }
        let api_key = settings
            .meal_estimate_api_key
            .filter(|key| !key.trim().is_empty())
            .ok_or_else(|| "Add your Gemini API key in Settings".to_string())?;
        (settings.meal_estimate_enabled, api_key, settings.meal_estimate_model)
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

#[tauri::command]
pub fn list_meal_estimate_api_logs(
    state: State<AppState>,
    limit: Option<i32>,
) -> Result<Vec<meal_estimate::MealEstimateApiLog>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    meal_estimate::list_api_logs(&db, limit.unwrap_or(100))
}

#[tauri::command]
pub fn clear_meal_estimate_api_logs(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    meal_estimate::clear_api_logs(&db)
}

#[tauri::command]
pub fn log_estimated_meal(
    state: State<AppState>,
    day_date: String,
    estimate: MealEstimate,
) -> Result<FoodEntry, String> {
    let estimate = meal_estimate::sanitize_estimate(estimate)?;
    let food_name = meal_estimate::estimated_food_name(&estimate.name);
    let calories = estimate.calories;

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
    drop(db);

    list_food_entries(state, day_date)?
        .into_iter()
        .find(|e| e.id == entry_id)
        .ok_or_else(|| "Failed to load food entry".to_string())
}

pub(crate) fn map_workout(row: &rusqlite::Row) -> rusqlite::Result<WorkoutEntry> {
    Ok(WorkoutEntry {
        id: row.get(0)?,
        day_date: row.get(1)?,
        workout_type: normalize_workout_type(&row.get(2)?),
        duration_min: row.get(3)?,
        intensity: normalize_workout_intensity(&row.get(4)?),
        calories: row.get(5)?,
        calories_override: row.get::<_, i64>(6)? != 0,
    })
}

#[tauri::command]
pub fn list_workouts(state: State<AppState>, date: String) -> Result<Vec<WorkoutEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, day_date, workout_type, duration_min, intensity, calories, calories_override
             FROM day_workouts
             WHERE day_date = ?1
             ORDER BY sort_order ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&date], map_workout)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
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
    if duration_min <= 0 {
        return Err("Workout duration must be greater than zero.".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR IGNORE INTO days (date) VALUES (?1)",
        [&day_date],
    )
    .map_err(|e| e.to_string())?;
    let sort_order: i64 = db
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM day_workouts WHERE day_date = ?1",
            [&day_date],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let workout_type = normalize_workout_type(&Some(workout_type));
    let intensity = normalize_workout_intensity(&Some(intensity));
    db.execute(
        "INSERT INTO day_workouts (day_date, workout_type, duration_min, intensity, calories, calories_override, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            day_date,
            workout_type,
            duration_min,
            intensity,
            calories,
            if calories_override { 1 } else { 0 },
            sort_order,
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();
    day_workouts::sync_day_workout_aggregates(&db, &day_date).map_err(|e| e.to_string())?;
    drop(db);
    list_workouts(state, day_date)?
        .into_iter()
        .find(|w| w.id == id)
        .ok_or_else(|| "Failed to load new workout".to_string())
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
    if duration_min <= 0 {
        return Err("Workout duration must be greater than zero.".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let day_date: String = db
        .query_row("SELECT day_date FROM day_workouts WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let workout_type = normalize_workout_type(&Some(workout_type));
    let intensity = normalize_workout_intensity(&Some(intensity));
    db.execute(
        "UPDATE day_workouts SET workout_type = ?1, duration_min = ?2, intensity = ?3, calories = ?4, calories_override = ?5
         WHERE id = ?6",
        params![
            workout_type,
            duration_min,
            intensity,
            calories,
            if calories_override { 1 } else { 0 },
            id,
        ],
    )
    .map_err(|e| e.to_string())?;
    day_workouts::sync_day_workout_aggregates(&db, &day_date).map_err(|e| e.to_string())?;
    drop(db);
    list_workouts(state, day_date)?
        .into_iter()
        .find(|w| w.id == id)
        .ok_or_else(|| "Workout not found".to_string())
}

#[tauri::command]
pub fn delete_workout(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let day_date: String = db
        .query_row("SELECT day_date FROM day_workouts WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    db.execute("DELETE FROM day_workouts WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    day_workouts::sync_day_workout_aggregates(&db, &day_date).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_metrics_range(
    state: State<AppState>,
    start: String,
    end: String,
) -> Result<Vec<MetricsPoint>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let journey = journey_start_from_db(&db)?;
    let start = clamp_range_start(&start, &journey);
    if end < start {
        return Ok(vec![]);
    }
    let mut stmt = db
        .prepare(
            "SELECT date, weight, total_calories, steps, distance_km, duration_min,
                    worked_out, workout_duration_min, workout_intensity, workout_calories,
                    workout_calories_override, daily_score, water_ml, teeth_brushings
             FROM days WHERE date >= ?1 AND date <= ?2 ORDER BY date ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start, end], |row| {
            Ok(MetricsPoint {
                date: row.get(0)?,
                weight: row.get(1)?,
                total_calories: row.get(2)?,
                steps: row.get(3)?,
                distance_km: row.get(4)?,
                duration_min: row.get(5)?,
                worked_out: row.get::<_, i64>(6)? != 0,
                workout_duration_min: row.get(7)?,
                workout_intensity: row.get(8)?,
                workout_calories: row.get(9)?,
                workout_calories_override: row.get::<_, i64>(10)? != 0,
                daily_score: row.get(11)?,
                water_ml: row.get(12)?,
                teeth_brushings: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_period_summary(state: State<AppState>, days: i64) -> Result<PeriodSummary, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let journey = journey_start_from_db(&db)?;
    let start = clamp_range_start(
        &(chrono::Local::now().date_naive() - chrono::Duration::days(days))
            .format("%Y-%m-%d")
            .to_string(),
        &journey,
    );
    db.query_row(
        "SELECT
            COUNT(*),
            AVG(total_calories),
            SUM(CASE WHEN worked_out = 1 THEN 1 ELSE 0 END),
            AVG(CASE WHEN daily_score IN ('good', 'perfect') THEN 100.0 WHEN daily_score IS NOT NULL THEN 0.0 ELSE NULL END),
            AVG(steps),
            AVG(water_ml),
            SUM(total_calories),
            SUM(CASE WHEN weight IS NOT NULL THEN 1 ELSE 0 END),
            AVG(distance_km),
            AVG(CASE WHEN daily_score = 'okay' THEN 100.0 WHEN daily_score IS NOT NULL THEN 0.0 ELSE NULL END),
            (SELECT weight FROM days WHERE date >= ?1 AND weight IS NOT NULL ORDER BY date ASC LIMIT 1)
              - (SELECT weight FROM days WHERE date >= ?1 AND weight IS NOT NULL ORDER BY date DESC LIMIT 1)
         FROM days WHERE date >= ?1",
        [&start],
        |row| {
            Ok(PeriodSummary {
                days_logged: row.get(0)?,
                avg_calories: row.get(1)?,
                workout_count: row.get(2)?,
                good_day_percent: row.get(3)?,
                avg_steps: row.get(4)?,
                avg_water_ml: row.get(5)?,
                total_calories: row.get(6)?,
                weight_log_days: row.get(7)?,
                avg_distance_km: row.get(8)?,
                okay_day_percent: row.get(9)?,
                weight_lost_kg: row.get(10)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_latest_weight(state: State<AppState>, before_date: String) -> Result<Option<f64>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let journey = journey_start_from_db(&db)?;
    if is_before_journey(&before_date, &journey) {
        return Ok(None);
    }
    match journey.as_ref().filter(|s| !s.is_empty()) {
        Some(js) => db
            .query_row(
                "SELECT weight FROM days WHERE date <= ?1 AND date >= ?2 AND weight IS NOT NULL ORDER BY date DESC LIMIT 1",
                params![before_date, js],
                |r| r.get(0),
            )
            .optional()
            .map_err(|e| e.to_string()),
        None => db
            .query_row(
                "SELECT weight FROM days WHERE date <= ?1 AND weight IS NOT NULL ORDER BY date DESC LIMIT 1",
                [&before_date],
                |r| r.get(0),
            )
            .optional()
            .map_err(|e| e.to_string()),
    }
}

#[tauri::command]
pub fn write_backup_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_backup(state: State<AppState>) -> Result<BackupData, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::export_backup_data(&db)
}

#[tauri::command]
pub fn export_sync_snapshot(state: State<AppState>) -> Result<crate::backup::SyncSnapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::export_sync_snapshot(&db, true)
}

#[tauri::command]
pub fn import_backup(state: State<AppState>, backup: BackupData) -> Result<(), String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::import_backup_data(&mut db, backup)
}

#[tauri::command]
pub fn import_sync_snapshot(
    state: State<AppState>,
    snapshot: crate::backup::SyncSnapshot,
) -> Result<(), String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::import_sync_snapshot(&mut db, snapshot)
}

#[tauri::command]
pub fn get_sync_state(state: State<AppState>) -> Result<crate::backup::SyncState, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::get_sync_state(&db)
}

#[tauri::command]
pub fn save_google_auth(
    state: State<AppState>,
    email: String,
    refresh_token: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::save_google_auth(&db, &email, &refresh_token)
}

#[tauri::command]
pub fn clear_google_auth(state: State<AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::clear_google_auth(&db)
}

#[tauri::command]
pub fn get_google_refresh_token(state: State<AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::get_google_refresh_token(&db)
}

#[tauri::command]
pub fn mark_synced(state: State<AppState>, synced_at: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::backup::mark_synced(&db, &synced_at)
}

#[tauri::command]
pub fn sync_push(
    state: State<AppState>,
    access_token: String,
) -> Result<crate::backup::SyncSnapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let snapshot = crate::sync::sync_push(&access_token, &db)?;
    crate::backup::mark_synced(&db, &snapshot.exported_at)?;
    Ok(snapshot)
}

#[tauri::command]
pub fn sync_pull(
    access_token: String,
) -> Result<crate::sync::SyncPullResult, String> {
    crate::sync::sync_pull(&access_token)
}

#[tauri::command]
pub fn read_backup_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_exercise_progress(
    state: State<AppState>,
    exercise_id: i64,
) -> Result<crate::exercise_progress::ExerciseProgress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::exercise_progress::get_exercise_progress(&db, exercise_id)
}

#[tauri::command]
pub fn add_exercise_log(
    state: State<AppState>,
    exercise_id: i64,
    input: crate::exercise_progress::ExerciseLogInput,
) -> Result<crate::exercise_progress::ExerciseProgress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::exercise_progress::add_exercise_log(&db, exercise_id, input)
}

#[tauri::command]
pub fn delete_exercise_log(state: State<AppState>, log_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::exercise_progress::delete_exercise_log(&db, log_id)
}

#[tauri::command]
pub fn get_routine_progress(
    state: State<AppState>,
    routine_id: i64,
) -> Result<crate::exercise_progress::RoutineProgress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::exercise_progress::get_routine_progress(&db, routine_id)
}

#[tauri::command]
pub fn add_routine_log(
    state: State<AppState>,
    routine_id: i64,
    day_date: String,
    entries: Vec<crate::exercise_progress::RoutineLogExerciseInput>,
) -> Result<crate::exercise_progress::RoutineProgress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::exercise_progress::add_routine_log(&db, routine_id, day_date, entries)
}

#[tauri::command]
pub fn delete_routine_log(state: State<AppState>, log_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::exercise_progress::delete_routine_log(&db, log_id)
}
