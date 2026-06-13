use crate::backup::{export_sync_snapshot, SyncSnapshot, SYNC_SCHEMA_VERSION};
use serde::{Deserialize, Serialize};

pub const SYNC_FILE_NAME: &str = "health-tracker-sync.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPullResult {
    pub found: bool,
    pub snapshot: Option<SyncSnapshot>,
    pub remote_modified_time: Option<String>,
}

pub fn sync_push(access_token: &str, db: &rusqlite::Connection) -> Result<SyncSnapshot, String> {
    let snapshot = export_sync_snapshot(db, true)?;
    let json = serde_json::to_string(&snapshot).map_err(|e| e.to_string())?;
    upload_app_data_file(access_token, &json)?;
    Ok(snapshot)
}

pub fn sync_pull(access_token: &str) -> Result<SyncPullResult, String> {
    match download_app_data_file(access_token)? {
        Some((json, modified_time)) => {
            let snapshot: SyncSnapshot = serde_json::from_str(&json)
                .map_err(|e| format!("Invalid cloud backup: {e}"))?;
            if snapshot.schema_version > SYNC_SCHEMA_VERSION {
                return Err(format!(
                    "Cloud backup requires a newer app version (schema {})",
                    snapshot.schema_version
                ));
            }
            Ok(SyncPullResult {
                found: true,
                snapshot: Some(snapshot),
                remote_modified_time: Some(modified_time),
            })
        }
        None => Ok(SyncPullResult {
            found: false,
            snapshot: None,
            remote_modified_time: None,
        }),
    }
}

fn drive_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .build()
        .map_err(|e| e.to_string())
}

fn auth_header(access_token: &str) -> String {
    format!("Bearer {}", access_token.trim())
}

fn find_app_data_file(access_token: &str) -> Result<Option<(String, String)>, String> {
    let client = drive_client()?;
    let url = format!(
        "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='{}'&fields=files(id,modifiedTime)",
        SYNC_FILE_NAME
    );
    let response = client
        .get(&url)
        .header("Authorization", auth_header(access_token))
        .send()
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!(
            "Drive list failed ({}): {}",
            response.status(),
            response.text().unwrap_or_default()
        ));
    }
    let body: DriveListResponse = response.json().map_err(|e| e.to_string())?;
    Ok(body
        .files
        .into_iter()
        .next()
        .map(|f| (f.id, f.modified_time)))
}

fn upload_app_data_file(access_token: &str, contents: &str) -> Result<(), String> {
    let client = drive_client()?;
    if let Some((file_id, _)) = find_app_data_file(access_token)? {
        let url = format!(
            "https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=media",
            file_id
        );
        let response = client
            .patch(&url)
            .header("Authorization", auth_header(access_token))
            .header("Content-Type", "application/json")
            .body(contents.to_string())
            .send()
            .map_err(|e| e.to_string())?;
        if !response.status().is_success() {
            return Err(format!(
                "Drive upload failed ({}): {}",
                response.status(),
                response.text().unwrap_or_default()
            ));
        }
        return Ok(());
    }

    let metadata = serde_json::json!({
        "name": SYNC_FILE_NAME,
        "mimeType": "application/json",
        "parents": ["appDataFolder"]
    });
    let boundary = "health_tracker_sync_boundary";
    let body = format!(
        "--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{metadata}\r\n--{boundary}\r\nContent-Type: application/json\r\n\r\n{contents}\r\n--{boundary}--\r\n",
        boundary = boundary,
        metadata = metadata,
        contents = contents
    );
    let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";
    let response = client
        .post(url)
        .header("Authorization", auth_header(access_token))
        .header(
            "Content-Type",
            format!("multipart/related; boundary={boundary}"),
        )
        .body(body)
        .send()
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!(
            "Drive create failed ({}): {}",
            response.status(),
            response.text().unwrap_or_default()
        ));
    }
    Ok(())
}

fn download_app_data_file(access_token: &str) -> Result<Option<(String, String)>, String> {
    let Some((file_id, modified_time)) = find_app_data_file(access_token)? else {
        return Ok(None);
    };
    let client = drive_client()?;
    let url = format!(
        "https://www.googleapis.com/drive/v3/files/{}?alt=media",
        file_id
    );
    let response = client
        .get(&url)
        .header("Authorization", auth_header(access_token))
        .send()
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!(
            "Drive download failed ({}): {}",
            response.status(),
            response.text().unwrap_or_default()
        ));
    }
    let text = response.text().map_err(|e| e.to_string())?;
    Ok(Some((text, modified_time)))
}

#[derive(Debug, Deserialize)]
struct DriveListResponse {
    files: Vec<DriveFile>,
}

#[derive(Debug, Deserialize)]
struct DriveFile {
    id: String,
    #[serde(rename = "modifiedTime")]
    modified_time: String,
}
