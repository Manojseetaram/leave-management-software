use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    extract::{Query, State},
    Json,
};
use domain::models::{AuditLogEntry, PageParams, Paged};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct AuditQuery {
    pub entity_type: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
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
