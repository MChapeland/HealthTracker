use crate::app::models::BackupData;
use crate::backup;
use crate::db::AppState;

pub fn export_backup(state: &AppState) -> Result<BackupData, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backup::export_backup_data(&db)
}

pub fn import_backup(state: &AppState, backup_data: BackupData) -> Result<(), String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    backup::import_backup_data(&mut db, backup_data)
}

/// Desktop-only filesystem helpers (used by the Tauri dialog flow). The web
/// client downloads/uploads JSON directly in the browser instead.
pub fn read_backup_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

pub fn write_backup_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|e| e.to_string())
}
