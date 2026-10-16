use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("authentication required")]
    Unauthenticated,
    #[error("forbidden")]
    Forbidden,
    #[error("password change required")]
    PasswordChangeRequired,
    #[error("not found")]
    NotFound,
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("internal error: {0}")]
    Internal(String),
}

pub type DomainResult<T> = Result<T, DomainError>;
