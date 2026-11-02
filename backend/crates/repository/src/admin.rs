use crate::db_err;
use chrono::{DateTime, Utc};
use domain::{
    error::DomainResult,
    models::{DashboardCounts, LeaveReportSummary, LeaveRequest},
};
use sqlx::PgExecutor;
use uuid::Uuid;

const LEAVE_COLS: &str = "id, student_id, request_type, reason, destination, start_at, end_at,
    status, submitted_at, decided_by, decided_at, decision_reason, completed_at, completed_by,
    completion_note, created_at, updated_at";

const REPORT_FILTER: &str = "WHERE ($1::timestamptz IS NULL OR end_at >= $1)
    AND ($2::timestamptz IS NULL OR start_at <= $2)
    AND ($3::text IS NULL OR status = $3)
    AND ($4::text IS NULL OR request_type = $4)
    AND ($5::uuid IS NULL OR student_id = $5)";

#[derive(Debug, Clone, Default)]
pub struct LeaveReportFilter {
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub request_type: Option<String>,
    pub student_id: Option<Uuid>,
    /// Whitelisted in the service layer before it reaches SQL.
    pub sort: String,
    pub limit: i64,
    pub offset: i64,
}

pub async fn dashboard_counts<'e>(ex: impl PgExecutor<'e>) -> DomainResult<DashboardCounts> {
    sqlx::query_as::<_, DashboardCounts>(
        "SELECT
           (SELECT count(*) FROM students WHERE deleted_at IS NULL) AS total_students,
           (SELECT count(*) FROM students WHERE deleted_at IS NULL AND status = 'active') AS active_students,
           (SELECT count(*) FROM leave_requests WHERE status = 'pending') AS pending_requests,
           (SELECT count(*) FROM leave_requests WHERE status = 'approved') AS approved_requests,
           (SELECT count(*) FROM leave_requests WHERE status = 'completed') AS completed_requests,
           (SELECT count(*) FROM documents WHERE verification_status = 'unverified') AS unverified_documents,
           (SELECT count(*) FROM notifications WHERE status IN ('queued', 'sending', 'failed')) AS queued_notifications,
           (SELECT count(*) FROM notifications WHERE status = 'failed') AS failed_notifications",
    )
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn report_list<'e>(
    ex: impl PgExecutor<'e>,
    f: &LeaveReportFilter,
) -> DomainResult<Vec<LeaveRequest>> {
    sqlx::query_as::<_, LeaveRequest>(&format!(
        "SELECT {LEAVE_COLS} FROM leave_requests {REPORT_FILTER}
         ORDER BY
           CASE WHEN $6 = 'start_at_asc' THEN start_at END ASC,
           CASE WHEN $6 = 'start_at_desc' THEN start_at END DESC,
           CASE WHEN $6 = 'created_at_asc' THEN created_at END ASC,
           CASE WHEN $6 = 'created_at_desc' THEN created_at END DESC,
           CASE WHEN $6 = 'status_asc' THEN status END ASC,
           CASE WHEN $6 = 'status_desc' THEN status END DESC,
           created_at DESC, id
         LIMIT $7 OFFSET $8"
    ))
    .bind(f.from)
    .bind(f.to)
    .bind(f.status.as_deref())
    .bind(f.request_type.as_deref())
    .bind(f.student_id)
    .bind(&f.sort)
    .bind(f.limit)
    .bind(f.offset)
    .fetch_all(ex)
    .await
    .map_err(db_err)
}

pub async fn report_summary<'e>(
    ex: impl PgExecutor<'e>,
    f: &LeaveReportFilter,
) -> DomainResult<LeaveReportSummary> {
    sqlx::query_as::<_, LeaveReportSummary>(&format!(
        "SELECT
           count(*) AS total,
           count(*) FILTER (WHERE status = 'pending') AS pending,
           count(*) FILTER (WHERE status = 'changes_requested') AS changes_requested,
           count(*) FILTER (WHERE status = 'approved') AS approved,
           count(*) FILTER (WHERE status = 'rejected') AS rejected,
           count(*) FILTER (WHERE status = 'withdrawn') AS withdrawn,
           count(*) FILTER (WHERE status = 'completed') AS completed,
           count(*) FILTER (WHERE request_type = 'personal_leave') AS personal_leave,
           count(*) FILTER (WHERE request_type = 'medical_leave') AS medical_leave,
           count(*) FILTER (WHERE request_type = 'event_permission') AS event_permission,
           count(*) FILTER (WHERE request_type = 'other') AS other
         FROM leave_requests {REPORT_FILTER}"
    ))
    .bind(f.from)
    .bind(f.to)
    .bind(f.status.as_deref())
    .bind(f.request_type.as_deref())
    .bind(f.student_id)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}
