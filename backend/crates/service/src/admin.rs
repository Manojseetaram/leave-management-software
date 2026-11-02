use crate::context::Core;
use chrono::{DateTime, Utc};
use domain::{
    error::{DomainError, DomainResult},
    leave::{RequestStatus, RequestType},
    models::{DashboardCounts, LeaveReportSummary, LeaveRequest, PageParams, Paged},
    principal::Principal,
};
use repository::{admin, leave};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct Dashboard {
    pub counts: DashboardCounts,
    pub recent_pending: Vec<LeaveRequest>,
}

#[derive(Debug, Default)]
pub struct ReportQuery {
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub request_type: Option<String>,
    pub student_id: Option<Uuid>,
    pub sort: Option<String>,
    pub page: PageParams,
}

#[derive(Debug, Serialize)]
pub struct LeaveReport {
    pub summary: LeaveReportSummary,
    #[serde(flatten)]
    pub page: Paged<LeaveRequest>,
}

fn require_reports(actor: &Principal) -> DomainResult<()> {
    if actor.can_view_audit() {
        Ok(())
    } else {
        Err(DomainError::Forbidden)
    }
}

pub async fn dashboard(core: &Core, actor: &Principal) -> DomainResult<Dashboard> {
    require_reports(actor)?;
    let counts = admin::dashboard_counts(&core.pool).await?;
    let recent_pending = leave::list(&core.pool, None, Some("pending"), 5, 0).await?;
    Ok(Dashboard {
        counts,
        recent_pending,
    })
}

const SORTS: [&str; 6] = [
    "created_at_desc",
    "created_at_asc",
    "start_at_desc",
    "start_at_asc",
    "status_asc",
    "status_desc",
];

pub async fn leave_report(
    core: &Core,
    actor: &Principal,
    query: ReportQuery,
) -> DomainResult<LeaveReport> {
    require_reports(actor)?;
    if let (Some(from), Some(to)) = (query.from, query.to) {
        if from > to {
            return Err(DomainError::Validation(
                "from must be before or equal to to".into(),
            ));
        }
    }
    let status = query
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    if let Some(status) = status {
        RequestStatus::parse(status)
            .ok_or_else(|| DomainError::Validation("unknown status filter".into()))?;
    }
    let request_type = query
        .request_type
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    if let Some(request_type) = request_type {
        RequestType::parse(request_type)
            .ok_or_else(|| DomainError::Validation("unknown request_type filter".into()))?;
    }
    let sort = query
        .sort
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("created_at_desc");
    if !SORTS.contains(&sort) {
        return Err(DomainError::Validation(format!(
            "sort must be one of {}",
            SORTS.join(", ")
        )));
    }

    let filter = repository::admin::LeaveReportFilter {
        from: query.from,
        to: query.to,
        status: status.map(str::to_string),
        request_type: request_type.map(str::to_string),
        student_id: query.student_id,
        sort: sort.to_string(),
        limit: query.page.limit(),
        offset: query.page.offset(),
    };
    let summary = admin::report_summary(&core.pool, &filter).await?;
    let total = summary.total;
    let items = admin::report_list(&core.pool, &filter).await?;
    Ok(LeaveReport {
        summary,
        page: Paged::new(items, total, query.page),
    })
}
