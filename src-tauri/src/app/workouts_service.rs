use crate::app::models::{
    fetch_routine, fetch_workout_template, map_workout, map_workout_template,
    normalize_workout_amount_unit, normalize_workout_intensity, normalize_workout_type,
    save_routine_exercises, Routine, WorkoutEntry, WorkoutTemplate,
};
use crate::day_workouts;
use crate::db::AppState;
use crate::exercise_progress::{
    self, ExerciseLogInput, ExerciseProgress, RoutineLogExerciseInput, RoutineProgress,
};
use rusqlite::params;

pub fn list_workout_templates(
    state: &AppState,
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

pub fn create_workout_template(
    state: &AppState,
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

pub fn update_workout_template(
    state: &AppState,
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

pub fn delete_workout_template(state: &AppState, id: i64) -> Result<(), String> {
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

pub fn list_routines(state: &AppState, query: Option<String>) -> Result<Vec<Routine>, String> {
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
        let exercises = crate::app::models::load_routine_exercises(&db, id)?;
        routines.push(Routine {
            id,
            name,
            created_at,
            exercises,
        });
    }
    Ok(routines)
}

pub fn create_routine(
    state: &AppState,
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

pub fn update_routine(
    state: &AppState,
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

pub fn delete_routine(state: &AppState, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM routines WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn list_workouts(state: &AppState, date: String) -> Result<Vec<WorkoutEntry>, String> {
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

pub fn add_workout(
    state: &AppState,
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
    let id = {
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
        id
    };
    list_workouts(state, day_date)?
        .into_iter()
        .find(|w| w.id == id)
        .ok_or_else(|| "Failed to load new workout".to_string())
}

pub fn update_workout(
    state: &AppState,
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
    let day_date = {
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
        day_date
    };
    list_workouts(state, day_date)?
        .into_iter()
        .find(|w| w.id == id)
        .ok_or_else(|| "Workout not found".to_string())
}

pub fn delete_workout(state: &AppState, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let day_date: String = db
        .query_row("SELECT day_date FROM day_workouts WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    db.execute("DELETE FROM day_workouts WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    day_workouts::sync_day_workout_aggregates(&db, &day_date).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_exercise_progress(
    state: &AppState,
    exercise_id: i64,
) -> Result<ExerciseProgress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    exercise_progress::get_exercise_progress(&db, exercise_id)
}

pub fn add_exercise_log(
    state: &AppState,
    exercise_id: i64,
    input: ExerciseLogInput,
) -> Result<ExerciseProgress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    exercise_progress::add_exercise_log(&db, exercise_id, input)
}

pub fn delete_exercise_log(state: &AppState, log_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    exercise_progress::delete_exercise_log(&db, log_id)
}

pub fn get_routine_progress(
    state: &AppState,
    routine_id: i64,
) -> Result<RoutineProgress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    exercise_progress::get_routine_progress(&db, routine_id)
}

pub fn add_routine_log(
    state: &AppState,
    routine_id: i64,
    day_date: String,
    entries: Vec<RoutineLogExerciseInput>,
) -> Result<RoutineProgress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    exercise_progress::add_routine_log(&db, routine_id, day_date, entries)
}

pub fn delete_routine_log(state: &AppState, log_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    exercise_progress::delete_routine_log(&db, log_id)
}
