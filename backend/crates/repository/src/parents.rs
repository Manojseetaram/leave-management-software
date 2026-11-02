use crate::db_err;
use domain::{error::DomainResult, models::ParentContact};
use sqlx::PgExecutor;
use uuid::Uuid;

const COLS: &str =
    "id, student_id, full_name, relationship, verified_at, sms_consent_at, active, created_at";

pub async fn insert<'e>(
    ex: impl PgExecutor<'e>,
    student_id: Uuid,
    full_name: &str,
    relationship: &str,
    phone_encrypted: &[u8],
    sms_consent: bool,
) -> DomainResult<ParentContact> {
    sqlx::query_as::<_, ParentContact>(&format!(
        "INSERT INTO parents (student_id, full_name, relationship, phone_encrypted, sms_consent_at)
         VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN now() ELSE NULL END) RETURNING {COLS}"
    ))
    .bind(student_id)
    .bind(full_name)
    .bind(relationship)
    .bind(phone_encrypted)
    .bind(sms_consent)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn get<'e>(ex: impl PgExecutor<'e>, id: Uuid) -> DomainResult<Option<ParentContact>> {
    sqlx::query_as::<_, ParentContact>(&format!("SELECT {COLS} FROM parents WHERE id = $1"))
        .bind(id)
        .fetch_optional(ex)
        .await
        .map_err(db_err)
}

pub async fn list_for_student<'e>(
    ex: impl PgExecutor<'e>,
    student_id: Uuid,
) -> DomainResult<Vec<ParentContact>> {
    sqlx::query_as::<_, ParentContact>(&format!(
        "SELECT {COLS} FROM parents WHERE student_id = $1 AND active ORDER BY created_at"
    ))
    .bind(student_id)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

#[allow(clippy::too_many_arguments)]
pub async fn update_fields<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
    full_name: Option<&str>,
    relationship: Option<&str>,
    phone_encrypted: Option<&[u8]>,
    active: Option<bool>,
    sms_consent: Option<bool>,
) -> DomainResult<ParentContact> {
    sqlx::query_as::<_, ParentContact>(&format!(
        "UPDATE parents SET
           full_name = COALESCE($2, full_name),
           relationship = COALESCE($3, relationship),
           phone_encrypted = COALESCE($4::bytea, phone_encrypted),
           verified_at = CASE WHEN $4::bytea IS NOT NULL THEN NULL ELSE verified_at END,
           active = COALESCE($5, active),
           sms_consent_at = CASE
             WHEN $6::boolean IS NULL THEN sms_consent_at
             WHEN $6 THEN COALESCE(sms_consent_at, now())
             ELSE NULL
           END
         WHERE id = $1 RETURNING {COLS}"
    ))
    .bind(id)
    .bind(full_name)
    .bind(relationship)
    .bind(phone_encrypted)
    .bind(active)
    .bind(sms_consent)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn insert_consent_history<'e>(
    ex: impl PgExecutor<'e>,
    parent_id: Uuid,
    actor_id: Uuid,
    action: &str,
) -> DomainResult<()> {
    sqlx::query(
        "INSERT INTO parent_consent_history (parent_id, actor_id, action)
         VALUES ($1, $2, $3)",
    )
    .bind(parent_id)
    .bind(actor_id)
    .bind(action)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn mark_verified<'e>(ex: impl PgExecutor<'e>, id: Uuid) -> DomainResult<ParentContact> {
    sqlx::query_as::<_, ParentContact>(&format!(
        "UPDATE parents SET verified_at = COALESCE(verified_at, now()) WHERE id = $1 RETURNING {COLS}"
    ))
    .bind(id)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}
