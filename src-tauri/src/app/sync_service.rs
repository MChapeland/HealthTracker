use crate::backup;
use crate::db::AppState;
use crate::sync;

pub fn export_sync_snapshot(state: &AppState) -> Result<backup::SyncSnapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backup::export_sync_snapshot(&db, true)
}

pub fn import_sync_snapshot(
    state: &AppState,
    snapshot: backup::SyncSnapshot,
) -> Result<(), String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    backup::import_sync_snapshot(&mut db, snapshot)
}

pub fn get_sync_state(state: &AppState) -> Result<backup::SyncState, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backup::get_sync_state(&db)
}

pub fn save_google_auth(
    state: &AppState,
    email: String,
    refresh_token: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backup::save_google_auth(&db, &email, &refresh_token)
}

pub fn clear_google_auth(state: &AppState) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backup::clear_google_auth(&db)
}

pub fn get_google_refresh_token(state: &AppState) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backup::get_google_refresh_token(&db)
}

pub fn mark_synced(state: &AppState, synced_at: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backup::mark_synced(&db, &synced_at)
}

pub fn sync_push(state: &AppState, access_token: String) -> Result<backup::SyncSnapshot, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let snapshot = sync::sync_push(&access_token, &db)?;
    backup::mark_synced(&db, &snapshot.exported_at)?;
    Ok(snapshot)
}

pub fn sync_pull(access_token: String) -> Result<sync::SyncPullResult, String> {
    sync::sync_pull(&access_token)
}
