use crate::db_err;
use chrono::{DateTime, Utc};
use domain::{error::DomainResult, models::EventRecord};
use sqlx::PgExecutor;
use uuid::Uuid;

const COLS: &str = "id, leave_request_id, student_id, title, organizer, event_website,
    location, start_at, end_at, participation_details, created_by, created_at, updated_at";

#[allow(clippy::too_many_arguments)]
pub async fn insert<'e>(
    ex: impl PgExecutor<'e>,
    leave_request_id: Uuid,
    student_id: Uuid,
    title: &str,
    organizer: &str,
    event_website: Option<&str>,
    location: Option<&str>,
    start_at: DateTime<Utc>,
    end_at: DateTime<Utc>,
    participation_details: Option<&str>,
    created_by: Uuid,
) -> DomainResult<EventRecord> {
    sqlx::query_as::<_, EventRecord>(&format!(
        "INSERT INTO events
         (leave_request_id, student_id, title, organizer, event_website, location,
          start_at, end_at, participation_details, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING {COLS}"
    ))
    .bind(leave_request_id)
    .bind(student_id)
    .bind(title)
    .bind(organizer)
    .bind(event_website)
    .bind(location)
    .bind(start_at)
    .bind(end_at)
    .bind(participation_details)
    .bind(created_by)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn get<'e>(ex: impl PgExecutor<'e>, id: Uuid) -> DomainResult<Option<EventRecord>> {
    sqlx::query_as::<_, EventRecord>(&format!("SELECT {COLS} FROM events WHERE id = $1"))
        .bind(id)
        .fetch_optional(ex)
        .await
        .map_err(db_err)
}

pub async fn get_by_request<'e>(
    ex: impl PgExecutor<'e>,
    leave_request_id: Uuid,
) -> DomainResult<Option<EventRecord>> {
    sqlx::query_as::<_, EventRecord>(&format!(
        "SELECT {COLS} FROM events WHERE leave_request_id = $1"
    ))
    .bind(leave_request_id)
    .fetch_optional(ex)
    .await
    .map_err(db_err)
}

#[allow(clippy::too_many_arguments)]
pub async fn update_fields<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
    title: &str,
    organizer: &str,
    event_website: Option<&str>,
    location: Option<&str>,
    start_at: DateTime<Utc>,
    end_at: DateTime<Utc>,
    participation_details: Option<&str>,
) -> DomainResult<EventRecord> {
    sqlx::query_as::<_, EventRecord>(&format!(
        "UPDATE events SET title = $2, organizer = $3, event_website = $4,
         location = $5, start_at = $6, end_at = $7, participation_details = $8,
         updated_at = now() WHERE id = $1 RETURNING {COLS}"
    ))
    .bind(id)
    .bind(title)
    .bind(organizer)
    .bind(event_website)
    .bind(location)
    .bind(start_at)
    .bind(end_at)
    .bind(participation_details)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn list<'e>(
    ex: impl PgExecutor<'e>,
    student_id: Option<Uuid>,
    limit: i64,
    offset: i64,
) -> DomainResult<Vec<EventRecord>> {
    sqlx::query_as::<_, EventRecord>(&format!(
        "SELECT {COLS} FROM events
         WHERE ($1::uuid IS NULL OR student_id = $1)
         ORDER BY start_at DESC LIMIT $2 OFFSET $3"
    ))
    .bind(student_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn count<'e>(ex: impl PgExecutor<'e>, student_id: Option<Uuid>) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM events WHERE ($1::uuid IS NULL OR student_id = $1)",
    )
    .bind(student_id)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}
