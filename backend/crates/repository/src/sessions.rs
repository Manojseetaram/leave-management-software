use crate::db_err;
use chrono::{DateTime, Utc};
use domain::{error::DomainResult, models::SessionInfo};
use sqlx::PgExecutor;
use uuid::Uuid;

pub async fn insert<'e>(
    ex: impl PgExecutor<'e>,
    user_id: Uuid,
    token_hash: &[u8],
    expires_at: DateTime<Utc>,
) -> DomainResult<Uuid> {
    sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(user_id)
    .bind(token_hash)
    .bind(expires_at)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

/// Returns (session_id, user_id) for a live session of an active user.
pub async fn find_active<'e>(
    ex: impl PgExecutor<'e>,
    token_hash: &[u8],
) -> DomainResult<Option<(Uuid, Uuid)>> {
    sqlx::query_as::<_, (Uuid, Uuid)>(
        "SELECT s.id, s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
           AND u.status = 'active'",
    )
    .bind(token_hash)
    .fetch_optional(ex)
    .await
    .map_err(db_err)
}

pub async fn list_for_user<'e>(
    ex: impl PgExecutor<'e>,
    user_id: Uuid,
) -> DomainResult<Vec<SessionInfo>> {
    sqlx::query_as::<_, SessionInfo>(
        "SELECT id, created_at, expires_at FROM sessions
         WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
         ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn revoke_one<'e>(
    ex: impl PgExecutor<'e>,
    user_id: Uuid,
    session_id: Uuid,
) -> DomainResult<u64> {
    sqlx::query(
        "UPDATE sessions SET revoked_at = now()
         WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
    )
    .bind(session_id)
    .bind(user_id)
    .execute(ex)
    .await
    .map(|r| r.rows_affected())
    .map_err(db_err)
}

pub async fn revoke_all<'e>(
    ex: impl PgExecutor<'e>,
    user_id: Uuid,
    except: Option<Uuid>,
) -> DomainResult<()> {
    sqlx::query(
        "UPDATE sessions SET revoked_at = now()
         WHERE user_id = $1 AND revoked_at IS NULL AND ($2::uuid IS NULL OR id <> $2)",
    )
    .bind(user_id)
    .bind(except)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}
