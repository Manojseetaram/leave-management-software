use crate::db_err;
use domain::{
    error::DomainResult,
    models::{FacultyLeaveRequest, FacultyStudent},
};
use sqlx::PgExecutor;
use uuid::Uuid;

const STUDENT_SELECT: &str = "
    SELECT s.id, s.register_number, u.full_name, s.department, s.semester,
           s.section, s.admission_year, s.status
    FROM students s JOIN users u ON u.id = s.user_id";

const STUDENT_FILTER: &str = "
    WHERE s.deleted_at IS NULL
      AND ($1::text IS NULL OR s.register_number ILIKE $1 OR u.full_name ILIKE $1)
      AND ($2::smallint IS NULL OR s.semester = $2)
      AND ($3::text IS NULL OR s.section = $3)";

pub async fn list_students<'e>(
    ex: impl PgExecutor<'e>,
    pattern: Option<&str>,
    semester: Option<i16>,
    section: Option<&str>,
    limit: i64,
    offset: i64,
) -> DomainResult<Vec<FacultyStudent>> {
    sqlx::query_as::<_, FacultyStudent>(&format!(
        "{STUDENT_SELECT} {STUDENT_FILTER} ORDER BY s.register_number LIMIT $4 OFFSET $5"
    ))
    .bind(pattern)
    .bind(semester)
    .bind(section)
    .bind(limit)
    .bind(offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn count_students<'e>(
    ex: impl PgExecutor<'e>,
    pattern: Option<&str>,
    semester: Option<i16>,
    section: Option<&str>,
) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>(&format!(
        "SELECT count(*) FROM students s JOIN users u ON u.id = s.user_id {STUDENT_FILTER}"
    ))
    .bind(pattern)
    .bind(semester)
    .bind(section)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

const LEAVE_SELECT: &str = "
    SELECT lr.id, lr.student_id, s.register_number, u.full_name AS student_name,
           lr.request_type, lr.start_at, lr.end_at, lr.status,
           lr.submitted_at, lr.decided_at
    FROM leave_requests lr
    JOIN students s ON s.id = lr.student_id
    JOIN users u ON u.id = s.user_id";

const LEAVE_FILTER: &str = "
    WHERE lr.status <> 'draft'
      AND ($1::text IS NULL OR lr.status = $1)
      AND ($2::text IS NULL OR lr.request_type = $2)
      AND ($3::uuid IS NULL OR lr.student_id = $3)";

pub async fn list_leave_requests<'e>(
    ex: impl PgExecutor<'e>,
    status: Option<&str>,
    request_type: Option<&str>,
    student_id: Option<Uuid>,
    limit: i64,
    offset: i64,
) -> DomainResult<Vec<FacultyLeaveRequest>> {
    sqlx::query_as::<_, FacultyLeaveRequest>(&format!(
        "{LEAVE_SELECT} {LEAVE_FILTER}
         ORDER BY COALESCE(lr.submitted_at, lr.created_at) DESC, lr.id
         LIMIT $4 OFFSET $5"
    ))
    .bind(status)
    .bind(request_type)
    .bind(student_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn count_leave_requests<'e>(
    ex: impl PgExecutor<'e>,
    status: Option<&str>,
    request_type: Option<&str>,
    student_id: Option<Uuid>,
) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>(&format!(
        "SELECT count(*) FROM leave_requests lr {LEAVE_FILTER}"
    ))
    .bind(status)
    .bind(request_type)
    .bind(student_id)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}
