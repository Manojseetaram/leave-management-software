use crate::db_err;
use domain::{error::DomainResult, models::StudentRecord};
use sqlx::PgExecutor;
use uuid::Uuid;

const SELECT: &str = "SELECT s.id, s.user_id, s.register_number, u.full_name, u.email, s.department,
        s.semester, s.section, s.admission_year, s.status, s.created_at, s.deleted_at
    FROM students s JOIN users u ON u.id = s.user_id";

pub async fn insert<'e>(
    ex: impl PgExecutor<'e>,
    user_id: Uuid,
    register_number: &str,
    semester: i16,
    section: Option<&str>,
    admission_year: Option<i16>,
) -> DomainResult<Uuid> {
    sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO students (user_id, register_number, semester, section, admission_year)
         VALUES ($1, $2, $3, $4, $5) RETURNING id",
    )
    .bind(user_id)
    .bind(register_number)
    .bind(semester)
    .bind(section)
    .bind(admission_year)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn get<'e>(ex: impl PgExecutor<'e>, id: Uuid) -> DomainResult<Option<StudentRecord>> {
    sqlx::query_as::<_, StudentRecord>(&format!("{SELECT} WHERE s.id = $1"))
        .bind(id)
        .fetch_optional(ex)
        .await
        .map_err(db_err)
}

/// Archived students are hidden unless `status = archived` is requested explicitly.
const FILTER: &str = "WHERE ($1::text IS NULL OR s.register_number ILIKE $1 OR u.full_name ILIKE $1)
    AND CASE WHEN $2::text IS NULL THEN s.status <> 'archived' ELSE s.status = $2 END";

pub fn like_pattern(q: &str) -> String {
    let escaped = q.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
    format!("%{escaped}%")
}

pub async fn list<'e>(
    ex: impl PgExecutor<'e>,
    pattern: Option<&str>,
    status: Option<&str>,
    limit: i64,
    offset: i64,
) -> DomainResult<Vec<StudentRecord>> {
    sqlx::query_as::<_, StudentRecord>(&format!(
        "{SELECT} {FILTER} ORDER BY s.register_number LIMIT $3 OFFSET $4"
    ))
    .bind(pattern)
    .bind(status)
    .bind(limit)
    .bind(offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn count<'e>(ex: impl PgExecutor<'e>, pattern: Option<&str>, status: Option<&str>) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>(&format!(
        "SELECT count(*) FROM students s JOIN users u ON u.id = s.user_id {FILTER}"
    ))
    .bind(pattern)
    .bind(status)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn update_fields<'e>(
    ex: impl PgExecutor<'e>,
    id: Uuid,
    semester: Option<i16>,
    section: Option<&str>,
    admission_year: Option<i16>,
    status: Option<&str>,
) -> DomainResult<()> {
    sqlx::query(
        "UPDATE students SET semester = COALESCE($2, semester), section = COALESCE($3, section),
         admission_year = COALESCE($4, admission_year), status = COALESCE($5, status),
         updated_at = now() WHERE id = $1",
    )
    .bind(id)
    .bind(semester)
    .bind(section)
    .bind(admission_year)
    .bind(status)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn set_archived<'e>(ex: impl PgExecutor<'e>, id: Uuid, archived: bool) -> DomainResult<()> {
    sqlx::query(
        "UPDATE students SET status = CASE WHEN $2 THEN 'archived' ELSE 'active' END,
         deleted_at = CASE WHEN $2 THEN now() ELSE NULL END, updated_at = now() WHERE id = $1",
    )
    .bind(id)
    .bind(archived)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}
