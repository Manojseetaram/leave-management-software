use crate::db_err;
use chrono::{DateTime, Utc};
use domain::{
    error::DomainResult,
    models::{LeaveRequest, RequestHistoryEntry},
};
use sqlx::PgExecutor;
use uuid::Uuid;

const COLS: &str = "id, student_id, request_type, reason, destination, start_at, end_at, status,
    submitted_at, decided_by, decided_at, decision_reason, created_at, updated_at";

pub async fn insert<'e>(
    ex: impl PgExecutor<'e>,
    student_id: Uuid,
    request_type: &str,
    reason: &str,
    destination: Option<&str>,
    start_at: DateTime<Utc>,
    end_at: DateTime<Utc>,
) -> DomainResult<LeaveRequest> {
    sqlx::query_as::<_, LeaveRequest>(&format!(
        "INSERT INTO leave_requests (student_id, request_type, reason, destination, start_at, end_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING {COLS}"
    ))
    .bind(student_id)
    .bind(request_type)
    .bind(reason)
    .bind(destination)
    .bind(start_at)
    .bind(end_at)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn get<'e>(ex: impl PgExecutor<'e>, id: Uuid) -> DomainResult<Option<LeaveRequest>> {
    sqlx::query_as::<_, LeaveRequest>(&format!("SELECT {COLS} FROM leave_requests WHERE id = $1"))
        .bind(id)
        .fetch_optional(ex)
        .await
        .map_err(db_err)
}

/// Row lock: concurrent approvals serialize here, so the loser sees the new status.
pub async fn get_for_update<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
) -> DomainResult<Option<LeaveRequest>> {
    sqlx::query_as::<_, LeaveRequest>(&format!(
        "SELECT {COLS} FROM leave_requests WHERE id = $1 FOR UPDATE"
    ))
    .bind(id)
    .fetch_optional(ex)
    .await
    .map_err(db_err)
}

const LIST_FILTER: &str =
    "WHERE ($1::uuid IS NULL OR student_id = $1) AND ($2::text IS NULL OR status = $2)";

pub async fn list<'e>(
    ex: impl PgExecutor<'e>,
    student_id: Option<Uuid>,
    status: Option<&str>,
    limit: i64,
    offset: i64,
) -> DomainResult<Vec<LeaveRequest>> {
    sqlx::query_as::<_, LeaveRequest>(&format!(
        "SELECT {COLS} FROM leave_requests {LIST_FILTER}
         ORDER BY created_at DESC LIMIT $3 OFFSET $4"
    ))
    .bind(student_id)
    .bind(status)
    .bind(limit)
    .bind(offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn count<'e>(
    ex: impl PgExecutor<'e>,
    student_id: Option<Uuid>,
    status: Option<&str>,
) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>(&format!(
        "SELECT count(*) FROM leave_requests {LIST_FILTER}"
    ))
    .bind(student_id)
    .bind(status)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn update_fields<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
    request_type: &str,
    reason: &str,
    destination: Option<&str>,
    start_at: DateTime<Utc>,
    end_at: DateTime<Utc>,
) -> DomainResult<LeaveRequest> {
    sqlx::query_as::<_, LeaveRequest>(&format!(
        "UPDATE leave_requests SET request_type = $2, reason = $3, destination = $4,
         start_at = $5, end_at = $6, updated_at = now() WHERE id = $1 RETURNING {COLS}"
    ))
    .bind(id)
    .bind(request_type)
    .bind(reason)
    .bind(destination)
    .bind(start_at)
    .bind(end_at)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

/// Applies a state change. `decision` stamps reviewer, time and reason together.
pub async fn set_status<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
    new_status: &str,
    mark_submitted: bool,
    decision: Option<(Uuid, Option<&str>)>,
) -> DomainResult<LeaveRequest> {
    let (decider, reason) = match decision {
        Some((d, r)) => (Some(d), r),
        None => (None, None),
    };
    sqlx::query_as::<_, LeaveRequest>(&format!(
        "UPDATE leave_requests SET status = $2,
           submitted_at = CASE WHEN $3 THEN now() ELSE submitted_at END,
           decided_by = CASE WHEN $4::uuid IS NOT NULL THEN $4::uuid ELSE decided_by END,
           decided_at = CASE WHEN $4::uuid IS NOT NULL THEN now() ELSE decided_at END,
           decision_reason = CASE WHEN $4::uuid IS NOT NULL THEN $5::text ELSE decision_reason END,
           updated_at = now()
         WHERE id = $1 RETURNING {COLS}"
    ))
    .bind(id)
    .bind(new_status)
    .bind(mark_submitted)
    .bind(decider)
    .bind(reason)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn insert_history<'e>(
    ex: impl PgExecutor<'e>,
    leave_request_id: Uuid,
    actor_id: Uuid,
    old_status: Option<&str>,
    new_status: &str,
    comment: Option<&str>,
) -> DomainResult<()> {
    sqlx::query(
        "INSERT INTO request_history (leave_request_id, actor_id, old_status, new_status, comment)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(leave_request_id)
    .bind(actor_id)
    .bind(old_status)
    .bind(new_status)
    .bind(comment)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn list_history<'e>(
    ex: impl PgExecutor<'e>,
    leave_request_id: Uuid,
) -> DomainResult<Vec<RequestHistoryEntry>> {
    sqlx::query_as::<_, RequestHistoryEntry>(
        "SELECT id, leave_request_id, actor_id, old_status, new_status, comment, created_at
         FROM request_history WHERE leave_request_id = $1 ORDER BY created_at, id",
    )
    .bind(leave_request_id)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}
