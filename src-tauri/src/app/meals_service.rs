use crate::app::models::{map_food, Food, FoodEntry};
use crate::day_totals;
use crate::db::AppState;
use rusqlite::{params, OptionalExtension};
use std::collections::HashMap;

pub fn get_food_last_eaten_dates(state: &AppState) -> Result<HashMap<i64, String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT food_id, MAX(day_date) FROM food_entries GROUP BY food_id")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<HashMap<_, _>, _>>()
        .map_err(|e| e.to_string())
}

pub fn list_foods(state: &AppState, query: Option<String>) -> Result<Vec<Food>, String> {
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

pub fn create_food(state: &AppState, food: Food) -> Result<Food, String> {
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

pub fn update_food(state: &AppState, food: Food) -> Result<Food, String> {
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

pub fn delete_food(state: &AppState, id: i64) -> Result<(), String> {
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

pub fn list_food_entries(state: &AppState, date: String) -> Result<Vec<FoodEntry>, String> {
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

pub fn add_food_entry(
    state: &AppState,
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

pub fn update_food_entry(
    state: &AppState,
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

pub fn delete_food_entry(state: &AppState, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let day_date: String = db
        .query_row("SELECT day_date FROM food_entries WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    db.execute("DELETE FROM food_entries WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    day_totals::recalc_day_food_totals(&db, &day_date).map_err(|e| e.to_string())?;
    Ok(())
}
