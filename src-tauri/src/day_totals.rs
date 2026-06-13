use rusqlite::{params, Connection, Result};

pub fn recalc_day_food_totals(conn: &Connection, day_date: &str) -> Result<()> {
    let totals: (f64, Option<f64>, Option<f64>, Option<f64>, Option<f64>, Option<f64>) =
        conn.query_row(
            "SELECT
                COALESCE(SUM(fe.calories), 0),
                SUM(CASE WHEN f.carbs IS NOT NULL AND f.reference_quantity > 0
                    THEN f.carbs * fe.quantity / f.reference_quantity END),
                SUM(CASE WHEN f.fat IS NOT NULL AND f.reference_quantity > 0
                    THEN f.fat * fe.quantity / f.reference_quantity END),
                SUM(CASE WHEN f.protein IS NOT NULL AND f.reference_quantity > 0
                    THEN f.protein * fe.quantity / f.reference_quantity END),
                SUM(CASE WHEN f.fiber IS NOT NULL AND f.reference_quantity > 0
                    THEN f.fiber * fe.quantity / f.reference_quantity END),
                SUM(CASE WHEN f.salt IS NOT NULL AND f.reference_quantity > 0
                    THEN f.salt * fe.quantity / f.reference_quantity END)
             FROM food_entries fe
             JOIN foods f ON f.id = fe.food_id
             WHERE fe.day_date = ?1",
            [day_date],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            },
        )?;

    conn.execute(
        "UPDATE days SET total_calories = ?1, total_carbs = ?2, total_fat = ?3,
         total_protein = ?4, total_fiber = ?5, total_salt = ?6 WHERE date = ?7",
        params![
            totals.0,
            totals.1,
            totals.2,
            totals.3,
            totals.4,
            totals.5,
            day_date,
        ],
    )?;
    Ok(())
}

pub fn backfill_all_day_food_totals(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("SELECT DISTINCT day_date FROM food_entries")?;
    let dates = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    for date in dates {
        recalc_day_food_totals(conn, &date)?;
    }
    Ok(())
}
