use rusqlite::{Connection, Result as SqlResult};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
}

pub fn init_db(app: &tauri::App) -> SqlResult<Connection> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    std::fs::create_dir_all(&app_dir).ok();
    let db_path: PathBuf = app_dir.join("tracker.db");
    let conn = Connection::open(db_path)?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn settings_has_column(conn: &Connection, name: &str) -> SqlResult<bool> {
    Ok(conn
        .prepare("PRAGMA table_info(settings)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .any(|col| col == name))
}

fn ensure_calorie_warning_below_column(conn: &Connection) -> SqlResult<()> {
    if !settings_has_column(conn, "calorie_warning_below")? {
        conn.execute_batch(include_str!(
            "../migrations/012_calorie_warning_below.sql"
        ))?;
    }
    Ok(())
}

fn ensure_target_monthly_weight_change_column(conn: &Connection) -> SqlResult<()> {
    if !settings_has_column(conn, "target_monthly_weight_change_kg")? {
        conn.execute_batch(include_str!(
            "../migrations/013_target_monthly_weight_change.sql"
        ))?;
    }
    Ok(())
}

fn ensure_target_weight_change_unit_column(conn: &Connection) -> SqlResult<()> {
    if !settings_has_column(conn, "target_weight_change_unit")? {
        conn.execute_batch(include_str!(
            "../migrations/014_target_weight_change_unit.sql"
        ))?;
    }
    Ok(())
}

fn ensure_food_score_weight_columns(conn: &Connection) -> SqlResult<()> {
    if !settings_has_column(conn, "score_weight_food_kcal")? {
        conn.execute(
            "ALTER TABLE settings ADD COLUMN score_weight_food_kcal INTEGER NOT NULL DEFAULT 75",
            [],
        )?;
    }
    if !settings_has_column(conn, "score_weight_food_macros")? {
        conn.execute(
            "ALTER TABLE settings ADD COLUMN score_weight_food_macros INTEGER NOT NULL DEFAULT 25",
            [],
        )?;
    }
    Ok(())
}

fn ensure_workouts_per_week_column(conn: &Connection) -> SqlResult<()> {
    if !settings_has_column(conn, "workouts_per_week")? {
        conn.execute_batch(include_str!("../migrations/016_workouts_per_week.sql"))?;
    }
    Ok(())
}

fn run_migrations(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)",
        [],
    )?;
    let version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if version < 2 {
        let has_journey_start: bool = conn
            .prepare("PRAGMA table_info(settings)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "journey_start_date");
        if !has_journey_start {
            conn.execute_batch(include_str!("../migrations/002_journey_start.sql"))?;
        }
        conn.execute("INSERT INTO schema_version (version) VALUES (2)", [])?;
    }

    if version < 3 {
        conn.execute_batch(include_str!("../migrations/003_score_weight_defaults.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (3)", [])?;
    }

    if version < 4 {
        let has_height: bool = conn
            .prepare("PRAGMA table_info(settings)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "height_cm");
        if !has_height {
            conn.execute_batch(include_str!("../migrations/004_metabolism_profile.sql"))?;
        }
        conn.execute("INSERT INTO schema_version (version) VALUES (4)", [])?;
    }

    if version < 5 {
        let has_birth_date: bool = conn
            .prepare("PRAGMA table_info(settings)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "birth_date");
        if !has_birth_date {
            conn.execute_batch(include_str!("../migrations/005_birth_date.sql"))?;
        }
        conn.execute("INSERT INTO schema_version (version) VALUES (5)", [])?;
    }

    if version < 6 {
        conn.execute_batch(include_str!("../migrations/006_perfect_day_and_thresholds.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (6)", [])?;
    }

    if version < 7 {
        let has_salt: bool = conn
            .prepare("PRAGMA table_info(foods)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "salt");
        if !has_salt {
            conn.execute_batch(include_str!("../migrations/007_add_salt.sql"))?;
        }
        conn.execute("INSERT INTO schema_version (version) VALUES (7)", [])?;
    }

    if version < 8 {
        let has_flag: bool = conn
            .prepare("PRAGMA table_info(settings)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "food_library_auto_populated");
        if !has_flag {
            conn.execute_batch(include_str!(
                "../migrations/008_food_library_auto_populated.sql"
            ))?;
        }
        crate::seed_foods::populate_if_needed(conn)?;
        conn.execute("INSERT INTO schema_version (version) VALUES (8)", [])?;
    }

    if version < 9 {
        let has_macro_goals: bool = conn
            .prepare("PRAGMA table_info(settings)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "macro_goal_protein");
        if !has_macro_goals {
            conn.execute_batch(include_str!(
                "../migrations/009_macro_goals_and_day_totals.sql"
            ))?;
        }
        crate::day_totals::backfill_all_day_food_totals(conn)?;
        conn.execute("INSERT INTO schema_version (version) VALUES (9)", [])?;
    }

    if version < 10 {
        ensure_food_score_weight_columns(conn)?;
        conn.execute("INSERT INTO schema_version (version) VALUES (10)", [])?;
    } else {
        ensure_food_score_weight_columns(conn)?;
    }

    if version < 11 {
        let has_workout_calories: bool = conn
            .prepare("PRAGMA table_info(days)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "workout_calories");
        if !has_workout_calories {
            conn.execute_batch(include_str!("../migrations/011_workout_calories.sql"))?;
        }
        conn.execute("INSERT INTO schema_version (version) VALUES (11)", [])?;
    }

    if version < 12 {
        ensure_calorie_warning_below_column(conn)?;
        conn.execute("INSERT INTO schema_version (version) VALUES (12)", [])?;
    } else {
        ensure_calorie_warning_below_column(conn)?;
    }

    if version < 13 {
        ensure_target_monthly_weight_change_column(conn)?;
        conn.execute("INSERT INTO schema_version (version) VALUES (13)", [])?;
    } else {
        ensure_target_monthly_weight_change_column(conn)?;
    }

    if version < 14 {
        ensure_target_weight_change_unit_column(conn)?;
        conn.execute("INSERT INTO schema_version (version) VALUES (14)", [])?;
    } else {
        ensure_target_weight_change_unit_column(conn)?;
    }

    if version < 15 {
        conn.execute_batch(include_str!(
            "../migrations/015_target_weight_change_unit_default.sql"
        ))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (15)", [])?;
    }

    if version < 16 {
        ensure_workouts_per_week_column(conn)?;
        conn.execute("INSERT INTO schema_version (version) VALUES (16)", [])?;
    } else {
        ensure_workouts_per_week_column(conn)?;
    }

    if version < 17 {
        conn.execute_batch(include_str!("../migrations/017_day_workouts.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (17)", [])?;
    }

    if version < 18 {
        let has_workout_type: bool = conn
            .prepare("PRAGMA table_info(day_workouts)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|name| name == "workout_type");
        if !has_workout_type {
            conn.execute_batch(include_str!("../migrations/018_workout_type.sql"))?;
        }
        conn.execute("INSERT INTO schema_version (version) VALUES (18)", [])?;
    }

    if version < 19 {
        if !settings_has_column(conn, "accent_color")? {
            conn.execute_batch(include_str!("../migrations/019_accent_color.sql"))?;
        }
        conn.execute("INSERT INTO schema_version (version) VALUES (19)", [])?;
    } else if !settings_has_column(conn, "accent_color")? {
        conn.execute_batch(include_str!("../migrations/019_accent_color.sql"))?;
    }

    if version < 20 {
        conn.execute_batch(include_str!("../migrations/020_accent_default_blue.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (20)", [])?;
    }

    if version < 21 {
        conn.execute_batch(include_str!("../migrations/021_remove_cyan_accent.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (21)", [])?;
    }

    if version < 22 {
        conn.execute_batch(include_str!("../migrations/022_workout_templates.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (22)", [])?;
    }

    if version < 23 {
        conn.execute_batch(include_str!("../migrations/023_routines.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (23)", [])?;
    }

    if version < 24 {
        conn.execute_batch(include_str!("../migrations/024_exercise_progress.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (24)", [])?;
    }

    if version < 25 {
        conn.execute_batch(include_str!("../migrations/025_exercise_log_sets.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (25)", [])?;
    }

    if version < 26 {
        conn.execute_batch(include_str!("../migrations/026_meal_estimate.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (26)", [])?;
    }

    if version < 27 {
        conn.execute_batch(include_str!("../migrations/027_gemini_model_default.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (27)", [])?;
    }

    if version < 28 {
        conn.execute_batch(include_str!("../migrations/028_meal_estimate_api_logs.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (28)", [])?;
    }

    if version < 29 {
        conn.execute_batch(include_str!("../migrations/029_sync_metadata.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (29)", [])?;
    }

    if version < 30 {
        conn.execute_batch(include_str!("../migrations/030_water_goal.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (30)", [])?;
    }

    if version < 31 {
        conn.execute_batch(include_str!("../migrations/031_teeth_brushing.sql"))?;
        conn.execute("INSERT INTO schema_version (version) VALUES (31)", [])?;
    }

    Ok(())
}

pub fn touch_local_modified(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "UPDATE settings SET local_modified_at = datetime('now') WHERE id = 1",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
