use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use domain::models::{EventRecord, NewEvent, PageParams, Paged, UpdateEvent};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct PageQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn create(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Json(body): Json<NewEvent>,
) -> ApiResult<(StatusCode, Json<EventRecord>)> {
    Ok((
        StatusCode::CREATED,
        Json(service::events::create(&core, &p, body).await?),
    ))
}

pub async fn list(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<PageQuery>,
) -> ApiResult<Json<Paged<EventRecord>>> {
    let page = PageParams {
        page: q.page,
        per_page: q.per_page,
    };
    Ok(Json(service::events::list(&core, &p, page).await?))
}

pub async fn show(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<EventRecord>> {
    Ok(Json(service::events::get(&core, &p, id).await?))
}

pub async fn update(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateEvent>,
) -> ApiResult<Json<EventRecord>> {
    Ok(Json(service::events::update(&core, &p, id, body).await?))
}
