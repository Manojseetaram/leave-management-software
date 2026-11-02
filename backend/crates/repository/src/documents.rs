use crate::db_err;
use domain::{error::DomainResult, models::DocumentRecord};
use sqlx::PgExecutor;
use uuid::Uuid;

const COLS: &str = "id, leave_request_id, event_id, uploader_id, document_type,
    original_filename, content_type, size_bytes, checksum_sha256, malware_scan_status,
    verification_status, verified_by, verified_at, review_notes, storage_key, created_at";

#[allow(clippy::too_many_arguments)]
pub async fn insert<'e>(
    ex: impl PgExecutor<'e>,
    leave_request_id: Option<Uuid>,
    event_id: Option<Uuid>,
    uploader_id: Uuid,
    document_type: &str,
    original_filename: &str,
    storage_key: &str,
    content_type: &str,
    size_bytes: i64,
    checksum_sha256: &str,
    malware_scan_status: &str,
) -> DomainResult<DocumentRecord> {
    sqlx::query_as::<_, DocumentRecord>(&format!(
        "INSERT INTO documents
         (leave_request_id, event_id, uploader_id, document_type, original_filename,
          storage_key, content_type, size_bytes, checksum_sha256, malware_scan_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING {COLS}"
    ))
    .bind(leave_request_id)
    .bind(event_id)
    .bind(uploader_id)
    .bind(document_type)
    .bind(original_filename)
    .bind(storage_key)
    .bind(content_type)
    .bind(size_bytes)
    .bind(checksum_sha256)
    .bind(malware_scan_status)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn get<'e>(ex: impl PgExecutor<'e>, id: Uuid) -> DomainResult<Option<DocumentRecord>> {
    sqlx::query_as::<_, DocumentRecord>(&format!("SELECT {COLS} FROM documents WHERE id = $1"))
        .bind(id)
        .fetch_optional(ex)
        .await
        .map_err(db_err)
}

pub async fn get_for_update<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
) -> DomainResult<Option<DocumentRecord>> {
    sqlx::query_as::<_, DocumentRecord>(&format!(
        "SELECT {COLS} FROM documents WHERE id = $1 FOR UPDATE"
    ))
    .bind(id)
    .fetch_optional(ex)
    .await
    .map_err(db_err)
}

pub async fn list_for_request<'e>(
    ex: impl PgExecutor<'e>,
    leave_request_id: Uuid,
) -> DomainResult<Vec<DocumentRecord>> {
    sqlx::query_as::<_, DocumentRecord>(&format!(
        "SELECT {COLS} FROM documents WHERE leave_request_id = $1 ORDER BY created_at, id"
    ))
    .bind(leave_request_id)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn list_for_event<'e>(
    ex: impl PgExecutor<'e>,
    event_id: Uuid,
) -> DomainResult<Vec<DocumentRecord>> {
    sqlx::query_as::<_, DocumentRecord>(&format!(
        "SELECT {COLS} FROM documents WHERE event_id = $1 ORDER BY created_at, id"
    ))
    .bind(event_id)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn list_all<'e>(
    ex: impl PgExecutor<'e>,
    verification_status: Option<&str>,
    limit: i64,
    offset: i64,
) -> DomainResult<Vec<DocumentRecord>> {
    sqlx::query_as::<_, DocumentRecord>(&format!(
        "SELECT {COLS} FROM documents
         WHERE ($1::text IS NULL OR verification_status = $1)
         ORDER BY created_at DESC, id LIMIT $2 OFFSET $3"
    ))
    .bind(verification_status)
    .bind(limit)
    .bind(offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn count_all<'e>(
    ex: impl PgExecutor<'e>,
    verification_status: Option<&str>,
) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM documents
         WHERE ($1::text IS NULL OR verification_status = $1)",
    )
    .bind(verification_status)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn mark_verification<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
    status: &str,
    reviewer_id: Uuid,
    review_notes: Option<&str>,
) -> DomainResult<DocumentRecord> {
    sqlx::query_as::<_, DocumentRecord>(&format!(
        "UPDATE documents SET verification_status = $2, verified_by = $3,
         verified_at = now(), review_notes = $4 WHERE id = $1 RETURNING {COLS}"
    ))
    .bind(id)
    .bind(status)
    .bind(reviewer_id)
    .bind(review_notes)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}
