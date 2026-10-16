use crate::db_err;
use domain::{error::DomainResult, models::AuditLogEntry};
use sqlx::PgExecutor;
use uuid::Uuid;

pub async fn insert<'e>(
    ex: impl PgExecutor<'e>,
    actor_id: Option<Uuid>,
    action: &str,
    entity_type: &str,
    entity_id: Option<Uuid>,
    metadata: serde_json::Value,
) -> DomainResult<()> {
    sqlx::query(
        "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(actor_id)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(metadata)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn list<'e>(
    ex: impl PgExecutor<'e>,
    entity_type: Option<&str>,
    limit: i64,
    offset: i64,
) -> DomainResult<Vec<AuditLogEntry>> {
    sqlx::query_as::<_, AuditLogEntry>(
        "SELECT id, actor_id, action, entity_type, entity_id, metadata, created_at
         FROM audit_logs
         WHERE ($1::text IS NULL OR entity_type = $1)
         ORDER BY id DESC LIMIT $2 OFFSET $3",
    )
    .bind(entity_type)
    .bind(limit)
    .bind(offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn count<'e>(ex: impl PgExecutor<'e>, entity_type: Option<&str>) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM audit_logs WHERE ($1::text IS NULL OR entity_type = $1)",
    )
    .bind(entity_type)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}
