use crate::db_err;
use chrono::{DateTime, Utc};
use domain::error::DomainResult;
use sqlx::PgExecutor;
use uuid::Uuid;

pub async fn insert_token<'e>(
    ex: impl PgExecutor<'e>,
    user_id: Uuid,
    token_hash: &[u8],
    expires_at: DateTime<Utc>,
) -> DomainResult<()> {
    sqlx::query(
        "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(token_hash)
    .bind(user_id)
    .bind(expires_at)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn find_user_by_token<'e>(
    ex: impl PgExecutor<'e>,
    token_hash: &[u8],
) -> DomainResult<Option<Uuid>> {
    sqlx::query_scalar::<_, Uuid>(
        "SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > now()",
    )
    .bind(token_hash)
    .fetch_optional(ex)
    .await
    .map_err(db_err)
}

pub async fn delete_token<'e>(ex: impl PgExecutor<'e>, token_hash: &[u8]) -> DomainResult<()> {
    sqlx::query("DELETE FROM password_reset_tokens WHERE token_hash = $1")
        .bind(token_hash)
        .execute(ex)
        .await
        .map(|_| ())
        .map_err(db_err)
}

pub async fn delete_all_for_user<'e>(ex: impl PgExecutor<'e>, user_id: Uuid) -> DomainResult<()> {
    sqlx::query("DELETE FROM password_reset_tokens WHERE user_id = $1")
        .bind(user_id)
        .execute(ex)
        .await
        .map(|_| ())
        .map_err(db_err)
}
