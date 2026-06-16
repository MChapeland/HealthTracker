use std::fmt;

/// Unified application error shared by the Tauri command layer and the HTTP
/// server. Carries a human-readable message and an HTTP status code so the
/// Axum layer can return structured JSON errors, while Tauri commands convert
/// it back into the plain `String` errors the frontend already expects.
#[derive(Debug, Clone)]
pub struct AppError {
    pub message: String,
    pub status: u16,
}

impl AppError {
    pub fn new(message: impl Into<String>, status: u16) -> Self {
        Self {
            message: message.into(),
            status,
        }
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(message, 400)
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(message, 401)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(message, 500)
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for AppError {}

/// Service functions return `Result<T, String>` today; the HTTP layer treats a
/// bare error string as an internal (500) error.
impl From<String> for AppError {
    fn from(message: String) -> Self {
        AppError::internal(message)
    }
}

impl From<&str> for AppError {
    fn from(message: &str) -> Self {
        AppError::internal(message.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(error: rusqlite::Error) -> Self {
        AppError::internal(error.to_string())
    }
}

/// Allows Tauri command wrappers (which return `Result<T, String>`) to use the
/// unified error transparently.
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.message
    }
}
