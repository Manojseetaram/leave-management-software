use crate::db_err;
use chrono::{DateTime, Utc};
use domain::{error::DomainResult, models::NotificationRecord};
use sqlx::PgExecutor;
use uuid::Uuid;

/// Everything the dispatcher needs to render and send one SMS.
#[derive(Debug, sqlx::FromRow)]
pub struct DispatchItem {
    pub id: Uuid,
    pub event_type: String,
    pub attempt_count: i32,
    pub phone_encrypted: Vec<u8>,
    pub student_name: String,
    pub register_number: String,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
}

/// Queues one SMS per eligible parent (active + verified + consented).
/// The dedupe key makes the call idempotent: re-running the same transition
/// cannot create duplicate messages. Call it AFTER the history row is written.
pub async fn enqueue_for_request<'e>(
    ex: impl PgExecutor<'e>,
    leave_request_id: Uuid,
    event_type: &str,
) -> DomainResult<u64> {
    sqlx::query(
        "INSERT INTO notifications (parent_id, leave_request_id, event_type, dedupe_key)
         SELECT p.id, lr.id, $2,
                lr.id::text || ':' || $2 || ':' || p.id::text || ':' ||
                (SELECT count(*) FROM request_history h WHERE h.leave_request_id = lr.id)::text
         FROM leave_requests lr JOIN parents p ON p.student_id = lr.student_id
         WHERE lr.id = $1 AND p.active AND p.verified_at IS NOT NULL AND p.sms_consent_at IS NOT NULL
         ON CONFLICT (dedupe_key) DO NOTHING",
    )
    .bind(leave_request_id)
    .bind(event_type)
    .execute(ex)
    .await
    .map(|r| r.rows_affected())
    .map_err(db_err)
}

/// Atomically claims due messages (SKIP LOCKED lets several workers run safely).
/// A message stuck in `sending` for 5 minutes (crashed worker) becomes claimable again.
pub async fn claim_due<'e>(
    ex: impl PgExecutor<'e>,
    batch: i64,
    max_attempts: i32,
) -> DomainResult<Vec<DispatchItem>> {
    sqlx::query_as::<_, DispatchItem>(
        "WITH due AS (
             SELECT id FROM notifications
             WHERE attempt_count < $2 AND next_attempt_at <= now()
               AND (status IN ('queued', 'failed')
                    OR (status = 'sending' AND updated_at < now() - interval '5 minutes'))
             ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED
         )
         UPDATE notifications n
         SET status = 'sending', attempt_count = n.attempt_count + 1, updated_at = now()
         FROM due, parents p, leave_requests lr, students s, users u
         WHERE n.id = due.id AND p.id = n.parent_id AND lr.id = n.leave_request_id
           AND s.id = lr.student_id AND u.id = s.user_id
         RETURNING n.id, n.event_type, n.attempt_count, p.phone_encrypted,
                   u.full_name AS student_name, s.register_number, lr.start_at, lr.end_at",
    )
    .bind(batch)
    .bind(max_attempts)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn mark_sent<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
    provider_message_id: &str,
) -> DomainResult<()> {
    sqlx::query(
        "UPDATE notifications SET status = 'sent', provider_message_id = $2, last_error = NULL,
         sent_at = now(), updated_at = now() WHERE id = $1",
    )
    .bind(id)
    .bind(provider_message_id)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn mark_failed<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
    error: &str,
    retry_in_secs: f64,
) -> DomainResult<()> {
    sqlx::query(
        "UPDATE notifications SET status = 'failed', last_error = $2,
         next_attempt_at = now() + make_interval(secs => $3::float8), updated_at = now()
         WHERE id = $1",
    )
    .bind(id)
    .bind(error)
    .bind(retry_in_secs)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn list<'e>(
    ex: impl PgExecutor<'e>,
    limit: i64,
    offset: i64,
) -> DomainResult<Vec<NotificationRecord>> {
    sqlx::query_as::<_, NotificationRecord>(
        "SELECT id, leave_request_id, event_type, channel, status, provider_message_id,
                attempt_count, last_error, created_at, sent_at
         FROM notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn count<'e>(ex: impl PgExecutor<'e>) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>("SELECT count(*) FROM notifications")
        .fetch_one(ex)
        .await
        .map_err(db_err)
}
