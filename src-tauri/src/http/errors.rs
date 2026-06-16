use crate::app::error::AppError;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

/// Axum-friendly wrapper around the shared [`AppError`]. Serializes to a JSON
/// body `{ "error": "..." }` with the appropriate HTTP status code.
pub struct ApiError(pub AppError);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = StatusCode::from_u16(self.0.status)
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        (status, Json(json!({ "error": self.0.message }))).into_response()
    }
}

impl<E> From<E> for ApiError
where
    E: Into<AppError>,
{
    fn from(error: E) -> Self {
        ApiError(error.into())
    }
}
