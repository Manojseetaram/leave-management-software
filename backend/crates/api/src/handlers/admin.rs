use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    extract::{Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use domain::models::{AuditLogEntry, PageParams, Paged};
use serde::Deserialize;
use service::admin::{Dashboard, LeaveReport, ReportQuery};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct AuditQuery {
    pub entity_type: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Deserialize)]
pub struct ReportParams {
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub request_type: Option<String>,
    pub student_id: Option<Uuid>,
    pub sort: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn dashboard(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
) -> ApiResult<Json<Dashboard>> {
    Ok(Json(service::admin::dashboard(&core, &p).await?))
}

pub async fn audit_logs(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<AuditQuery>,
) -> ApiResult<Json<Paged<AuditLogEntry>>> {
    let page = PageParams {
        page: q.page,
        per_page: q.per_page,
    };
    Ok(Json(
        service::audit::list(&core, &p, q.entity_type.as_deref(), page).await?,
    ))
}

pub async fn leave_report(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<ReportParams>,
) -> ApiResult<Json<LeaveReport>> {
    let query = ReportQuery {
        from: q.from,
        to: q.to,
        status: q.status,
        request_type: q.request_type,
        student_id: q.student_id,
        sort: q.sort,
        page: PageParams {
            page: q.page,
            per_page: q.per_page,
        },
    };
    Ok(Json(service::admin::leave_report(&core, &p, query).await?))
}
