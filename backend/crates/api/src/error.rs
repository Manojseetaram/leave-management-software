use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use domain::error::DomainError;
use serde_json::json;

pub struct ApiError(pub DomainError);
pub type ApiResult<T> = Result<T, ApiError>;

impl From<DomainError> for ApiError {
    fn from(e: DomainError) -> Self {
        Self(e)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self.0 {
            DomainError::Validation(m) => (StatusCode::UNPROCESSABLE_ENTITY, "validation_error", m.clone()),
            DomainError::Unauthenticated => (StatusCode::UNAUTHORIZED, "unauthenticated", "authentication required".to_string()),
            DomainError::Forbidden => (StatusCode::FORBIDDEN, "forbidden", "you do not have permission to do this".to_string()),
            DomainError::PasswordChangeRequired => (
                StatusCode::FORBIDDEN,
                "password_change_required",
                "you must change your temporary password first".to_string(),
            ),
            DomainError::NotFound => (StatusCode::NOT_FOUND, "not_found", "resource not found".to_string()),
            DomainError::Conflict(m) => (StatusCode::CONFLICT, "conflict", m.clone()),
            DomainError::Internal(m) => {
                tracing::error!(error = %m, "internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal_error", "internal server error".to_string())
            }
        };
        (status, Json(json!({ "error": { "code": code, "message": message } }))).into_response()
    }
}
