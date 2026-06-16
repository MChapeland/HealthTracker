use crate::meal_estimate;
use rusqlite::params;
use serde::{Deserialize, Serialize};

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
    #[serde(default)]
    pub ai_enabled: bool,
    #[serde(default)]
    pub ai_api_key: Option<String>,
    #[serde(default = "default_ai_model")]
    pub ai_model: String,
    #[serde(default)]
    pub ai_feedback_enabled: bool,
    #[serde(default)]
    pub ai_verbose_logging: bool,
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

fn default_ai_model() -> String {
    meal_estimate::DEFAULT_GEMINI_MODEL.to_string()
}

pub(crate) fn resolve_ai_api_key(settings: &Settings) -> Option<String> {
    settings
        .ai_api_key
        .as_ref()
        .or(settings.meal_estimate_api_key.as_ref())
        .filter(|key| !key.trim().is_empty())
        .map(|key| key.trim().to_string())
}

pub(crate) fn resolve_ai_model(settings: &Settings) -> String {
    let model = if settings.ai_model.trim().is_empty() {
        settings.meal_estimate_model.as_str()
    } else {
        settings.ai_model.as_str()
    };
    normalize_meal_estimate_model(model)
}

pub(crate) fn normalize_weight_change_unit(unit: &str) -> String {
    match unit.trim() {
        "day" | "week" | "month" | "year" => unit.trim().to_string(),
        _ => "month".to_string(),
    }
}

pub(crate) fn normalize_accent_color(color: &str) -> String {
    match color.trim() {
        "emerald" | "blue" | "violet" | "rose" | "amber" | "grey" => {
            color.trim().to_string()
        }
        _ => "blue".to_string(),
    }
}

pub(crate) fn normalize_meal_estimate_model(model: &str) -> String {
    meal_estimate::normalize_meal_estimate_model(model)
}

pub const SETTINGS_SELECT: &str = "SELECT starting_weight, target_weight, step_length_m, speed_kmh, steps_per_km,
                daily_steps_goal, calorie_ideal_min, calorie_ideal_max, calorie_warning, calorie_max,
                score_weight_calories, score_weight_walking, score_weight_workout, score_weight_trend,
                score_good_threshold, score_okay_threshold, onboarding_complete, journey_start_date,
                height_cm, birth_date, sex, activity_level,
                macro_goal_carbs, macro_goal_fat, macro_goal_protein, macro_goal_fiber, macro_goal_salt,
                score_weight_food_kcal, score_weight_food_macros, calorie_warning_below,
                target_monthly_weight_change_kg, target_weight_change_unit, workouts_per_week, accent_color,
                meal_estimate_enabled, meal_estimate_api_key, meal_estimate_model,
                daily_water_goal_ml, daily_teeth_brushings_goal, score_weight_teeth,
                ai_enabled, ai_api_key, ai_model, ai_feedback_enabled, ai_verbose_logging
         FROM settings WHERE id = 1";

pub const DAY_SELECT: &str = "SELECT date, weight, walking_primary, steps, distance_km, duration_min,
                worked_out, workout_duration_min, workout_intensity, workout_calories,
                workout_calories_override, notes, daily_score, total_calories,
                total_carbs, total_fat, total_protein, total_fiber, total_salt, water_ml,
                teeth_brushings
         FROM days";

pub(crate) fn journey_start_from_db(
    db: &rusqlite::Connection,
) -> Result<Option<String>, String> {
    db.query_row(
        "SELECT journey_start_date FROM settings WHERE id = 1",
        [],
        |r| r.get(0),
    )
    .map_err(|e| e.to_string())
}

pub(crate) fn clamp_range_start(requested: &str, journey: &Option<String>) -> String {
    if let Some(js) = journey.as_ref().filter(|s| !s.is_empty()) {
        if requested < js.as_str() {
            return js.clone();
        }
    }
    requested.to_string()
}

pub(crate) fn is_before_journey(date: &str, journey: &Option<String>) -> bool {
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

pub fn map_settings(row: &rusqlite::Row) -> rusqlite::Result<Settings> {
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
        ai_enabled: row.get::<_, i64>(40)? != 0,
        ai_api_key: row.get(41)?,
        ai_model: normalize_meal_estimate_model(&row.get::<_, String>(42)?),
        ai_feedback_enabled: row.get::<_, i64>(43)? != 0,
        ai_verbose_logging: row.get::<_, i64>(44)? != 0,
    })
}

pub fn map_food(row: &rusqlite::Row) -> rusqlite::Result<Food> {
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

pub fn normalize_workout_amount_unit(unit: &str) -> Result<String, String> {
    match unit.trim().to_lowercase().as_str() {
        "reps" | "rep" | "rep(s)" => Ok("reps".to_string()),
        "mins" | "minutes" | "minute" | "minute(s)" | "min" => Ok("mins".to_string()),
        "hrs" | "hours" | "hour" | "hour(s)" | "hr" => Ok("hrs".to_string()),
        "km" => Ok("km".to_string()),
        _ => Err("Unit must be reps, mins, hrs, or km".to_string()),
    }
}

pub fn map_workout_template(row: &rusqlite::Row) -> rusqlite::Result<WorkoutTemplate> {
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

pub fn fetch_workout_template(
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

pub fn load_routine_exercises(
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

pub(crate) fn save_routine_exercises(
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

pub fn fetch_routine(db: &rusqlite::Connection, id: i64) -> Result<Routine, String> {
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

pub fn map_day(row: &rusqlite::Row) -> rusqlite::Result<DayRecord> {
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

pub(crate) fn empty_day(date: &str) -> DayRecord {
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

pub(crate) fn normalize_workout_intensity(intensity: &Option<String>) -> String {
    match intensity.as_deref() {
        Some("low") => "low".to_string(),
        Some("medium") => "medium".to_string(),
        Some("high") => "high".to_string(),
        _ => "medium".to_string(),
    }
}

pub(crate) fn normalize_workout_type(workout_type: &Option<String>) -> String {
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

pub(crate) fn workout_is_valid(duration_min: Option<i64>) -> bool {
    duration_min.is_some_and(|m| m > 0)
}

pub(crate) fn apply_workout_rules(day: &mut DayRecord) {
    day.workout_intensity = Some(normalize_workout_intensity(&day.workout_intensity));
    day.worked_out = workout_is_valid(day.workout_duration_min);
}

pub fn map_workout(row: &rusqlite::Row) -> rusqlite::Result<WorkoutEntry> {
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
