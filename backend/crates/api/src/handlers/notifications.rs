use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    extract::{Query, State},
    Json,
};
use domain::models::{NotificationRecord, PageParams, Paged};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct PageQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn list(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<PageQuery>,
) -> ApiResult<Json<Paged<NotificationRecord>>> {
    let page = PageParams {
        page: q.page,
        per_page: q.per_page,
    };
    Ok(Json(service::notifications::list(&core, &p, page).await?))
}
