use crate::commands::{
    load_routine_exercises, map_day, map_food, map_settings, map_workout, map_workout_template,
    BackupData, DayRecord, Food, FoodEntry, Routine, WorkoutEntry, WorkoutTemplate,
    DAY_SELECT, SETTINGS_SELECT,
};
use crate::db::touch_local_modified;
use crate::exercise_progress::{
    ExerciseLog, ExerciseLogSet, RoutineLogEntry, RoutineLogSession,
};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const SYNC_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSnapshot {
    pub schema_version: u32,
    pub exported_at: String,
    pub device_id: String,
    pub data: BackupData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    pub google_account_email: Option<String>,
    pub device_id: String,
    pub last_synced_at: Option<String>,
    pub local_modified_at: Option<String>,
}

pub fn get_sync_state(db: &Connection) -> Result<SyncState, String> {
    db.query_row(
        "SELECT google_account_email, device_id, last_synced_at, local_modified_at
         FROM settings WHERE id = 1",
        [],
        |row| {
            Ok(SyncState {
                google_account_email: row.get(0)?,
                device_id: row
                    .get::<_, Option<String>>(1)?
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| "unknown".to_string()),
                last_synced_at: row.get(2)?,
                local_modified_at: row.get(3)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn ensure_device_id(db: &Connection) -> Result<String, String> {
    let existing: Option<String> = db
        .query_row(
            "SELECT device_id FROM settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|s: &String| !s.is_empty());
    if let Some(id) = existing {
        return Ok(id);
    }
    let id = uuid_v4();
    db.execute(
        "UPDATE settings SET device_id = ?1 WHERE id = 1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!(
        "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        (nanos & 0xffff_ffff) as u32,
        ((nanos >> 32) & 0xffff) as u16,
        ((nanos >> 48) & 0xfff) as u16,
        (((nanos >> 60) & 0x3fff) as u16 | 0x8000),
        nanos & 0xffff_ffff_ffff
    )
}

pub fn save_google_auth(
    db: &Connection,
    email: &str,
    refresh_token: &str,
) -> Result<(), String> {
    db.execute(
        "UPDATE settings SET google_account_email = ?1, google_refresh_token = ?2 WHERE id = 1",
        params![email.trim(), refresh_token.trim()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_google_refresh_token(db: &Connection) -> Result<Option<String>, String> {
    db.query_row(
        "SELECT google_refresh_token FROM settings WHERE id = 1",
        [],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

pub fn clear_google_auth(db: &Connection) -> Result<(), String> {
    db.execute(
        "UPDATE settings SET google_account_email = NULL, google_refresh_token = NULL WHERE id = 1",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn mark_synced(db: &Connection, synced_at: &str) -> Result<(), String> {
    db.execute(
        "UPDATE settings SET last_synced_at = ?1, local_modified_at = ?1 WHERE id = 1",
        params![synced_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn load_all_exercise_logs(db: &Connection) -> Result<Vec<ExerciseLog>, String> {
    let mut stmt = db
        .prepare(
            "SELECT el.id, el.exercise_id, el.day_date, wt.amount_unit, el.calories, el.created_at
             FROM exercise_logs el
             INNER JOIN workout_templates wt ON wt.id = el.exercise_id
             ORDER BY el.day_date ASC, el.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<f64>>(4)?,
                row.get::<_, String>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut logs = Vec::new();
    for row in rows {
        let (id, exercise_id, day_date, amount_unit, calories, created_at) =
            row.map_err(|e| e.to_string())?;
        let mut set_stmt = db
            .prepare(
                "SELECT id, sort_order, amount, weight_kg
                 FROM exercise_log_sets WHERE exercise_log_id = ?1
                 ORDER BY sort_order ASC, id ASC",
            )
            .map_err(|e| e.to_string())?;
        let sets = set_stmt
            .query_map([id], |r| {
                Ok(ExerciseLogSet {
                    id: r.get(0)?,
                    sort_order: r.get(1)?,
                    amount: r.get(2)?,
                    weight_kg: r.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        logs.push(ExerciseLog {
            id,
            exercise_id,
            day_date,
            amount_unit,
            calories,
            created_at,
            sets,
        });
    }
    Ok(logs)
}

fn load_all_routine_sessions(db: &Connection) -> Result<Vec<RoutineLogSession>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, routine_id, day_date, created_at
             FROM routine_logs ORDER BY day_date ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut sessions = Vec::new();
    for row in rows {
        let (id, routine_id, day_date, created_at) = row.map_err(|e| e.to_string())?;
        let mut entry_stmt = db
            .prepare(
                "SELECT rle.id, rle.exercise_id, wt.name, rle.amount, rle.amount_unit,
                        rle.calories, rle.weight_kg, rle.sort_order
                 FROM routine_log_entries rle
                 INNER JOIN workout_templates wt ON wt.id = rle.exercise_id
                 WHERE rle.routine_log_id = ?1
                 ORDER BY rle.sort_order ASC, rle.id ASC",
            )
            .map_err(|e| e.to_string())?;
        let entries = entry_stmt
            .query_map([id], |r| {
                Ok(RoutineLogEntry {
                    id: r.get(0)?,
                    exercise_id: r.get(1)?,
                    name: r.get(2)?,
                    amount: r.get(3)?,
                    amount_unit: r.get(4)?,
                    calories: r.get(5)?,
                    weight_kg: r.get(6)?,
                    sort_order: r.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        let total_calories = entries.iter().filter_map(|e| e.calories).sum();
        sessions.push(RoutineLogSession {
            id,
            routine_id,
            day_date,
            created_at,
            entries,
            total_calories,
        });
    }
    Ok(sessions)
}

pub fn export_backup_data(db: &Connection) -> Result<BackupData, String> {
    let settings = db
        .query_row(SETTINGS_SELECT, [], map_settings)
        .map_err(|e| e.to_string())?;

    let foods: Vec<Food> = db
        .prepare(
            "SELECT id, name, reference_quantity, reference_unit, calories, protein, carbs, fat, fiber, micronutrients, salt
             FROM foods ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?
        .query_map([], map_food)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let journey = settings.journey_start_date.clone();
    let days: Vec<DayRecord> = if let Some(js) = journey.filter(|s: &String| !s.is_empty()) {
        let mut stmt = db
            .prepare(&format!("{DAY_SELECT} WHERE date >= ?1 ORDER BY date ASC"))
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([&js], map_day)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    } else {
        let mut stmt = db
            .prepare(&format!("{DAY_SELECT} ORDER BY date ASC"))
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], map_day)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    let food_entries: Vec<FoodEntry> = db
        .prepare(
            "SELECT fe.id, fe.day_date, fe.food_id, f.name, fe.quantity, fe.unit, fe.calories,
                    f.reference_quantity, f.protein, f.carbs, f.fat, f.fiber, f.salt
             FROM food_entries fe JOIN foods f ON f.id = fe.food_id",
        )
        .map_err(|e| e.to_string())?
        .query_map([], |row| {
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
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let day_workouts: Vec<WorkoutEntry> = db
        .prepare(
            "SELECT id, day_date, workout_type, duration_min, intensity, calories, calories_override
             FROM day_workouts ORDER BY day_date ASC, sort_order ASC, id ASC",
        )
        .map_err(|e| e.to_string())?
        .query_map([], map_workout)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let workout_templates: Vec<WorkoutTemplate> = db
        .prepare(
            "SELECT id, name, amount, amount_unit, calories, created_at
             FROM workout_templates ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?
        .query_map([], map_workout_template)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let routine_rows: Vec<(i64, String, String)> = db
        .prepare("SELECT id, name, created_at FROM routines ORDER BY name ASC")
        .map_err(|e| e.to_string())?
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let mut routines = Vec::with_capacity(routine_rows.len());
    for (id, name, created_at) in routine_rows {
        let exercises = load_routine_exercises(db, id)?;
        routines.push(Routine {
            id,
            name,
            created_at,
            exercises,
        });
    }

    let exercise_logs = load_all_exercise_logs(db)?;
    let routine_log_sessions = load_all_routine_sessions(db)?;

    Ok(BackupData {
        settings,
        foods,
        workout_templates,
        routines,
        days,
        food_entries,
        day_workouts,
        exercise_logs,
        routine_log_sessions,
    })
}

pub fn export_sync_snapshot(db: &Connection, strip_api_key: bool) -> Result<SyncSnapshot, String> {
    let device_id = ensure_device_id(db)?;
    let mut data = export_backup_data(db)?;
    if strip_api_key {
        data.settings.meal_estimate_api_key = None;
    }
    Ok(SyncSnapshot {
        schema_version: SYNC_SCHEMA_VERSION,
        exported_at: Utc::now().to_rfc3339(),
        device_id,
        data,
    })
}

fn clear_user_data(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute_batch(
        "DELETE FROM routine_log_entries;
         DELETE FROM routine_logs;
         DELETE FROM exercise_log_sets;
         DELETE FROM exercise_logs;
         DELETE FROM food_entries;
         DELETE FROM day_workouts;
         DELETE FROM routine_exercises;
         DELETE FROM routines;
         DELETE FROM days;
         DELETE FROM foods;
         DELETE FROM workout_templates;",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn import_backup_data(db: &mut Connection, backup: BackupData) -> Result<(), String> {
    let local_api_key: Option<String> = db
        .query_row(
            "SELECT meal_estimate_api_key FROM settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let local_email: Option<String> = db
        .query_row(
            "SELECT google_account_email FROM settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let local_refresh: Option<String> = db
        .query_row(
            "SELECT google_refresh_token FROM settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let device_id = ensure_device_id(db)?;

    let tx = db.transaction().map_err(|e| e.to_string())?;
    clear_user_data(&tx)?;

    let mut template_id_map: HashMap<i64, i64> = HashMap::new();
    for template in &backup.workout_templates {
        tx.execute(
            "INSERT INTO workout_templates (name, amount, amount_unit, calories, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                template.name,
                template.amount,
                template.amount_unit,
                template.calories,
                template.created_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        template_id_map.insert(template.id, tx.last_insert_rowid());
    }

    let mut food_id_map: HashMap<i64, i64> = HashMap::new();
    for food in &backup.foods {
        tx.execute(
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
        food_id_map.insert(food.id, tx.last_insert_rowid());
    }

    let mut routine_id_map: HashMap<i64, i64> = HashMap::new();
    for routine in &backup.routines {
        tx.execute(
            "INSERT INTO routines (name, created_at) VALUES (?1, ?2)",
            params![routine.name, routine.created_at],
        )
        .map_err(|e| e.to_string())?;
        let new_routine_id = tx.last_insert_rowid();
        routine_id_map.insert(routine.id, new_routine_id);
        for item in &routine.exercises {
            let exercise_id = template_id_map.get(&item.exercise_id).copied().ok_or_else(|| {
                format!("Routine references missing exercise id {}", item.exercise_id)
            })?;
            tx.execute(
                "INSERT INTO routine_exercises (routine_id, exercise_id, sort_order)
                 VALUES (?1, ?2, ?3)",
                params![new_routine_id, exercise_id, item.sort_order],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for day in &backup.days {
        tx.execute(
            "INSERT INTO days (date, weight, walking_primary, steps, distance_km, duration_min,
             worked_out, workout_duration_min, workout_intensity, workout_calories,
             workout_calories_override, notes, daily_score, total_calories,
             total_carbs, total_fat, total_protein, total_fiber, total_salt, water_ml,
             teeth_brushings)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21)",
            params![
                day.date,
                day.weight,
                day.walking_primary,
                day.steps,
                day.distance_km,
                day.duration_min,
                if day.worked_out { 1 } else { 0 },
                day.workout_duration_min,
                day.workout_intensity,
                day.workout_calories,
                if day.workout_calories_override { 1 } else { 0 },
                day.notes,
                day.daily_score,
                day.total_calories,
                day.total_carbs,
                day.total_fat,
                day.total_protein,
                day.total_fiber,
                day.total_salt,
                day.water_ml,
                day.teeth_brushings,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    for entry in &backup.food_entries {
        let food_id = food_id_map.get(&entry.food_id).copied().ok_or_else(|| {
            format!("Food entry references missing food id {}", entry.food_id)
        })?;
        tx.execute(
            "INSERT INTO food_entries (day_date, food_id, quantity, unit, calories)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                entry.day_date,
                food_id,
                entry.quantity,
                entry.unit,
                entry.calories,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    for workout in &backup.day_workouts {
        tx.execute(
            "INSERT INTO day_workouts (day_date, workout_type, duration_min, intensity, calories, calories_override, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
            params![
                workout.day_date,
                workout.workout_type,
                workout.duration_min,
                workout.intensity,
                workout.calories,
                if workout.calories_override { 1 } else { 0 },
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    let mut exercise_log_id_map: HashMap<i64, i64> = HashMap::new();
    for log in &backup.exercise_logs {
        let exercise_id = template_id_map.get(&log.exercise_id).copied().ok_or_else(|| {
            format!("Exercise log references missing template id {}", log.exercise_id)
        })?;
        tx.execute(
            "INSERT INTO exercise_logs (exercise_id, day_date, calories, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![exercise_id, log.day_date, log.calories, log.created_at],
        )
        .map_err(|e| e.to_string())?;
        let new_log_id = tx.last_insert_rowid();
        exercise_log_id_map.insert(log.id, new_log_id);
        for set in &log.sets {
            tx.execute(
                "INSERT INTO exercise_log_sets (exercise_log_id, sort_order, amount, weight_kg)
                 VALUES (?1, ?2, ?3, ?4)",
                params![new_log_id, set.sort_order, set.amount, set.weight_kg],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for session in &backup.routine_log_sessions {
        let routine_id = routine_id_map.get(&session.routine_id).copied().ok_or_else(|| {
            format!("Routine log references missing routine id {}", session.routine_id)
        })?;
        tx.execute(
            "INSERT INTO routine_logs (routine_id, day_date, created_at)
             VALUES (?1, ?2, ?3)",
            params![routine_id, session.day_date, session.created_at],
        )
        .map_err(|e| e.to_string())?;
        let new_log_id = tx.last_insert_rowid();
        for entry in &session.entries {
            let exercise_id = template_id_map.get(&entry.exercise_id).copied().ok_or_else(|| {
                format!(
                    "Routine log entry references missing exercise id {}",
                    entry.exercise_id
                )
            })?;
            tx.execute(
                "INSERT INTO routine_log_entries (routine_log_id, exercise_id, amount, amount_unit, calories, weight_kg, sort_order)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    new_log_id,
                    exercise_id,
                    entry.amount,
                    entry.amount_unit,
                    entry.calories,
                    entry.weight_kg,
                    entry.sort_order,
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let mut settings = backup.settings;
    settings.meal_estimate_api_key = local_api_key;
    settings.workout_days_per_week = settings.workout_days_per_week.clamp(1, 7);

    tx.execute(
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
            google_account_email = ?41, google_refresh_token = ?42, device_id = ?43
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
            settings.target_weight_change_unit,
            settings.workout_days_per_week,
            settings.accent_color,
            if settings.meal_estimate_enabled { 1 } else { 0 },
            settings.meal_estimate_api_key,
            settings.meal_estimate_model,
            settings.daily_water_goal_ml,
            settings.daily_teeth_brushings_goal,
            settings.score_weight_teeth,
            local_email,
            local_refresh,
            device_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    touch_local_modified(db)?;
    Ok(())
}

pub fn import_sync_snapshot(db: &mut Connection, snapshot: SyncSnapshot) -> Result<(), String> {
    if snapshot.schema_version > SYNC_SCHEMA_VERSION {
        return Err(format!(
            "Backup requires a newer app version (schema {})",
            snapshot.schema_version
        ));
    }
    import_backup_data(db, snapshot.data)
}
