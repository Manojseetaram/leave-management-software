//! All SQL lives here. Functions take any sqlx executor, so the service layer
//! decides whether they run on the pool or inside a transaction.
pub mod audit;
pub mod leave;
pub mod notifications;
pub mod parents;
pub mod sessions;
pub mod students;
pub mod users;

use domain::error::{DomainError, DomainResult};
use sqlx::postgres::PgPoolOptions;
pub use sqlx::PgPool;

/// Maps database errors onto domain errors. Raw SQL errors never reach API clients.
pub fn db_err(e: sqlx::Error) -> DomainError {
    if let Some(db) = e.as_database_error() {
        if db.is_unique_violation() {
            return DomainError::Conflict("a record with these details already exists".into());
        }
        if db.is_foreign_key_violation() {
            return DomainError::Validation("referenced record does not exist".into());
        }
        if db.is_check_violation() {
            return DomainError::Conflict(db.message().to_string());
        }
    }
    tracing::error!(error = %e, "database error");
    DomainError::Internal(e.to_string())
}

pub async fn connect(url: &str, max_connections: u32) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new().max_connections(max_connections).connect(url).await
}

pub async fn ping(pool: &PgPool) -> DomainResult<()> {
    sqlx::query("SELECT 1").execute(pool).await.map(|_| ()).map_err(db_err)
}
