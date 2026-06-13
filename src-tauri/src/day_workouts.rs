use rusqlite::{params, Connection, Result as SqlResult};

fn normalize_intensity(intensity: &str) -> &str {
    match intensity {
        "low" | "medium" | "high" => intensity,
        _ => "medium",
    }
}

fn intensity_rank(intensity: &str) -> i32 {
    match intensity {
        "high" => 3,
        "medium" => 2,
        "low" => 1,
        _ => 2,
    }
}

pub fn sync_day_workout_aggregates(conn: &Connection, day_date: &str) -> SqlResult<()> {
    let mut stmt = conn.prepare(
        "SELECT duration_min, intensity, calories, calories_override
         FROM day_workouts
         WHERE day_date = ?1 AND duration_min > 0
         ORDER BY sort_order ASC, id ASC",
    )?;
    let rows = stmt.query_map([day_date], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<f64>>(2)?,
            row.get::<_, i64>(3)? != 0,
        ))
    })?;

    let mut total_duration: i64 = 0;
    let mut total_calories: f64 = 0.0;
    let mut has_calories = false;
    let mut any_override = false;
    let mut top_intensity = "medium".to_string();

    for row in rows {
        let (duration, intensity, calories, calories_override) = row?;
        total_duration += duration;
        if let Some(c) = calories {
            total_calories += c;
            has_calories = true;
        }
        if calories_override {
            any_override = true;
        }
        let normalized = normalize_intensity(&intensity).to_string();
        if intensity_rank(&normalized) > intensity_rank(&top_intensity) {
            top_intensity = normalized;
        }
    }

    let worked_out = total_duration > 0;
    let workout_duration_min = if worked_out {
        Some(total_duration)
    } else {
        None
    };
    let workout_intensity = if worked_out {
        Some(top_intensity)
    } else {
        None
    };
    let workout_calories = if worked_out && has_calories {
        Some(total_calories)
    } else {
        None
    };

    conn.execute(
        "UPDATE days SET
            worked_out = ?1,
            workout_duration_min = ?2,
            workout_intensity = ?3,
            workout_calories = ?4,
            workout_calories_override = ?5,
            updated_at = datetime('now')
         WHERE date = ?6",
        params![
            if worked_out { 1 } else { 0 },
            workout_duration_min,
            workout_intensity,
            workout_calories,
            if any_override { 1 } else { 0 },
            day_date,
        ],
    )?;

    Ok(())
}
