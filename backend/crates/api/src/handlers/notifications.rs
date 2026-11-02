use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use domain::models::{NotificationDetail, NotificationRecord, PageParams, Paged};
use serde::Deserialize;
use service::notifications::NotificationFilter;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct PageQuery {
    pub status: Option<String>,
    pub event_type: Option<String>,
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
    let filter = NotificationFilter {
        status: q.status,
        event_type: q.event_type,
    };
    Ok(Json(
        service::notifications::list(&core, &p, &filter, page).await?,
    ))
}

pub async fn show(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<NotificationDetail>> {
    Ok(Json(service::notifications::show(&core, &p, id).await?))
}

/// Signed provider callback. This route is deliberately unauthenticated at the
/// bearer-token layer; the HMAC over the raw body is the authentication.
pub async fn delivery_callback(
    State(core): State<AppState>,
    Path(provider): Path<String>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<Json<NotificationDetail>> {
    let signature = headers.get("x-sms-signature").and_then(|v| v.to_str().ok());
    Ok(Json(
        service::notifications::handle_delivery_callback(&core, &provider, signature, &body)
            .await?,
    ))
}
