use crate::commands::{
    fetch_routine, fetch_workout_template, normalize_workout_amount_unit, Routine, WorkoutTemplate,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseLogSet {
    pub id: i64,
    pub sort_order: i64,
    pub amount: f64,
    pub weight_kg: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseLog {
    pub id: i64,
    pub exercise_id: i64,
    pub day_date: String,
    pub amount_unit: String,
    pub calories: Option<f64>,
    pub created_at: String,
    pub sets: Vec<ExerciseLogSet>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseProgress {
    pub exercise: WorkoutTemplate,
    pub logs: Vec<ExerciseLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineLogEntry {
    pub id: i64,
    pub exercise_id: i64,
    pub name: String,
    pub amount: f64,
    pub amount_unit: String,
    pub calories: Option<f64>,
    pub weight_kg: Option<f64>,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineLogSession {
    pub id: i64,
    pub routine_id: i64,
    pub day_date: String,
    pub created_at: String,
    pub entries: Vec<RoutineLogEntry>,
    pub total_calories: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineProgress {
    pub routine: Routine,
    pub sessions: Vec<RoutineLogSession>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseLogSetInput {
    pub amount: f64,
    pub weight_kg: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseLogInput {
    pub day_date: String,
    pub calories: Option<f64>,
    pub sets: Vec<ExerciseLogSetInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineLogExerciseInput {
    pub exercise_id: i64,
    pub amount: f64,
    pub calories: Option<f64>,
    pub weight_kg: Option<f64>,
}

fn load_exercise_log_sets(
    db: &Connection,
    exercise_log_id: i64,
) -> Result<Vec<ExerciseLogSet>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, sort_order, amount, weight_kg
             FROM exercise_log_sets
             WHERE exercise_log_id = ?1
             ORDER BY sort_order ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([exercise_log_id], |row| {
            Ok(ExerciseLogSet {
                id: row.get(0)?,
                sort_order: row.get(1)?,
                amount: row.get(2)?,
                weight_kg: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn load_exercise_logs(db: &Connection, exercise_id: i64) -> Result<Vec<ExerciseLog>, String> {
    let exercise = fetch_workout_template(db, exercise_id)?;
    let amount_unit = normalize_workout_amount_unit(&exercise.amount_unit)?;
    let mut stmt = db
        .prepare(
            "SELECT id, exercise_id, day_date, calories, created_at
             FROM exercise_logs
             WHERE exercise_id = ?1
             ORDER BY day_date ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([exercise_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<f64>>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let log_rows: Vec<(i64, i64, String, Option<f64>, String)> = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut logs = Vec::with_capacity(log_rows.len());
    for (id, ex_id, day_date, calories, created_at) in log_rows {
        let sets = load_exercise_log_sets(db, id)?;
        logs.push(ExerciseLog {
            id,
            exercise_id: ex_id,
            day_date,
            amount_unit: amount_unit.clone(),
            calories,
            created_at,
            sets,
        });
    }
    Ok(logs)
}

fn load_routine_log_entries(
    db: &Connection,
    routine_log_id: i64,
) -> Result<Vec<RoutineLogEntry>, String> {
    let mut stmt = db
        .prepare(
            "SELECT rle.id, rle.exercise_id, wt.name, rle.amount, rle.amount_unit,
                    rle.calories, rle.weight_kg, rle.sort_order
             FROM routine_log_entries rle
             INNER JOIN workout_templates wt ON wt.id = rle.exercise_id
             WHERE rle.routine_log_id = ?1
             ORDER BY rle.sort_order ASC, rle.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([routine_log_id], |row| {
            let raw_unit: String = row.get(4)?;
            let amount_unit = normalize_workout_amount_unit(&raw_unit).unwrap_or(raw_unit);
            Ok(RoutineLogEntry {
                id: row.get(0)?,
                exercise_id: row.get(1)?,
                name: row.get(2)?,
                amount: row.get(3)?,
                amount_unit,
                calories: row.get(5)?,
                weight_kg: row.get(6)?,
                sort_order: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn session_total_calories(entries: &[RoutineLogEntry]) -> f64 {
    entries.iter().filter_map(|e| e.calories).sum()
}

fn validate_set_inputs(sets: &[ExerciseLogSetInput]) -> Result<(), String> {
    if sets.is_empty() {
        return Err("Add at least one set".to_string());
    }
    for (i, set) in sets.iter().enumerate() {
        if set.amount <= 0.0 {
            return Err(format!("Set {} must have amount greater than zero", i + 1));
        }
        if let Some(w) = set.weight_kg {
            if w < 0.0 {
                return Err(format!("Set {} weight cannot be negative", i + 1));
            }
        }
    }
    Ok(())
}

pub fn get_exercise_progress(db: &Connection, exercise_id: i64) -> Result<ExerciseProgress, String> {
    let exercise = fetch_workout_template(db, exercise_id)?;
    let logs = load_exercise_logs(db, exercise_id)?;
    Ok(ExerciseProgress { exercise, logs })
}

pub fn add_exercise_log(
    db: &Connection,
    exercise_id: i64,
    input: ExerciseLogInput,
) -> Result<ExerciseProgress, String> {
    let exercise = fetch_workout_template(db, exercise_id)?;
    if input.day_date.trim().is_empty() {
        return Err("Date is required".to_string());
    }
    validate_set_inputs(&input.sets)?;
    if let Some(c) = input.calories {
        if c < 0.0 {
            return Err("Calories cannot be negative".to_string());
        }
    }

    db.execute(
        "INSERT INTO exercise_logs (exercise_id, day_date, calories)
         VALUES (?1, ?2, ?3)",
        params![exercise_id, input.day_date.trim(), input.calories],
    )
    .map_err(|e| e.to_string())?;
    let log_id = db.last_insert_rowid();

    for (sort_order, set) in input.sets.iter().enumerate() {
        db.execute(
            "INSERT INTO exercise_log_sets (exercise_log_id, sort_order, amount, weight_kg)
             VALUES (?1, ?2, ?3, ?4)",
            params![log_id, sort_order as i64, set.amount, set.weight_kg],
        )
        .map_err(|e| e.to_string())?;
    }

    let _ = exercise;
    get_exercise_progress(db, exercise_id)
}

pub fn delete_exercise_log(db: &Connection, log_id: i64) -> Result<(), String> {
    db.execute("DELETE FROM exercise_logs WHERE id = ?1", [log_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_routine_progress(db: &Connection, routine_id: i64) -> Result<RoutineProgress, String> {
    let routine = fetch_routine(db, routine_id)?;
    let mut stmt = db
        .prepare(
            "SELECT id, routine_id, day_date, created_at
             FROM routine_logs
             WHERE routine_id = ?1
             ORDER BY day_date ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([routine_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let log_rows: Vec<(i64, i64, String, String)> = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut sessions = Vec::with_capacity(log_rows.len());
    for (id, rid, day_date, created_at) in log_rows {
        let entries = load_routine_log_entries(db, id)?;
        let total_calories = session_total_calories(&entries);
        sessions.push(RoutineLogSession {
            id,
            routine_id: rid,
            day_date,
            created_at,
            entries,
            total_calories,
        });
    }

    Ok(RoutineProgress { routine, sessions })
}

pub fn add_routine_log(
    db: &Connection,
    routine_id: i64,
    day_date: String,
    entries: Vec<RoutineLogExerciseInput>,
) -> Result<RoutineProgress, String> {
    let routine = fetch_routine(db, routine_id)?;
    let day_date = day_date.trim();
    if day_date.is_empty() {
        return Err("Date is required".to_string());
    }
    if entries.is_empty() {
        return Err("Log at least one exercise".to_string());
    }

    let expected: std::collections::HashSet<i64> = routine
        .exercises
        .iter()
        .map(|e| e.exercise_id)
        .collect();

    db.execute(
        "INSERT INTO routine_logs (routine_id, day_date) VALUES (?1, ?2)",
        params![routine_id, day_date],
    )
    .map_err(|e| e.to_string())?;
    let log_id = db.last_insert_rowid();

    for (sort_order, entry) in entries.iter().enumerate() {
        if !expected.contains(&entry.exercise_id) {
            return Err("Exercise is not part of this routine".to_string());
        }
        if entry.amount <= 0.0 {
            return Err("Amount must be greater than zero".to_string());
        }
        let template = fetch_workout_template(db, entry.exercise_id)?;
        let unit = normalize_workout_amount_unit(&template.amount_unit)?;
        if let Some(w) = entry.weight_kg {
            if w < 0.0 {
                return Err("Weight cannot be negative".to_string());
            }
        }
        if let Some(c) = entry.calories {
            if c < 0.0 {
                return Err("Calories cannot be negative".to_string());
            }
        }
        db.execute(
            "INSERT INTO routine_log_entries
             (routine_log_id, exercise_id, amount, amount_unit, calories, weight_kg, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                log_id,
                entry.exercise_id,
                entry.amount,
                unit,
                entry.calories,
                entry.weight_kg,
                sort_order as i64,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    get_routine_progress(db, routine_id)
}

pub fn delete_routine_log(db: &Connection, log_id: i64) -> Result<(), String> {
    db.execute("DELETE FROM routine_logs WHERE id = ?1", [log_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
