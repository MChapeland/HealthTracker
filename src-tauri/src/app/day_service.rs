use crate::app::models::{
    clamp_range_start, empty_day, is_before_journey, journey_start_from_db, map_day, DayInput,
    DayRecord, MetricsPoint, PeriodSummary, DAY_SELECT,
};
use crate::db::AppState;
use rusqlite::{params, OptionalExtension};

pub fn get_day(state: &AppState, date: String) -> Result<DayRecord, String> {
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

pub fn list_days(state: &AppState, start: String, end: String) -> Result<Vec<DayRecord>, String> {
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

pub fn upsert_day(state: &AppState, day: DayInput) -> Result<DayRecord, String> {
    {
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
    }
    get_day(state, day.date)
}

pub fn get_metrics_range(
    state: &AppState,
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

pub fn get_period_summary(state: &AppState, days: i64) -> Result<PeriodSummary, String> {
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

pub fn get_latest_weight(state: &AppState, before_date: String) -> Result<Option<f64>, String> {
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
