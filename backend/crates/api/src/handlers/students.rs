use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use domain::models::{LeaveRequest, NewStudent, PageParams, Paged, StudentRecord, UpdateStudent};
use serde::Deserialize;
use service::students::{CreatedStudent, StudentFilter};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ListQuery {
    pub q: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Deserialize)]
pub struct PageQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn create(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Json(body): Json<NewStudent>,
) -> ApiResult<(StatusCode, Json<CreatedStudent>)> {
    Ok((StatusCode::CREATED, Json(service::students::create(&core, &p, body).await?)))
}

pub async fn list(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<ListQuery>,
) -> ApiResult<Json<Paged<StudentRecord>>> {
    let filter = StudentFilter { q: q.q, status: q.status, page: PageParams { page: q.page, per_page: q.per_page } };
    Ok(Json(service::students::list(&core, &p, filter).await?))
}

pub async fn show(State(core): State<AppState>, AuthUser(p): AuthUser, Path(id): Path<Uuid>) -> ApiResult<Json<StudentRecord>> {
    Ok(Json(service::students::get(&core, &p, id).await?))
}

pub async fn update(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateStudent>,
) -> ApiResult<Json<StudentRecord>> {
    Ok(Json(service::students::update(&core, &p, id, body).await?))
}

pub async fn deactivate(State(core): State<AppState>, AuthUser(p): AuthUser, Path(id): Path<Uuid>) -> ApiResult<Json<StudentRecord>> {
    Ok(Json(service::students::deactivate(&core, &p, id).await?))
}

pub async fn restore(State(core): State<AppState>, AuthUser(p): AuthUser, Path(id): Path<Uuid>) -> ApiResult<Json<StudentRecord>> {
    Ok(Json(service::students::restore(&core, &p, id).await?))
}

pub async fn reset_password(State(core): State<AppState>, AuthUser(p): AuthUser, Path(id): Path<Uuid>) -> ApiResult<Json<CreatedStudent>> {
    Ok(Json(service::students::reset_password(&core, &p, id).await?))
}

pub async fn history(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
    Query(q): Query<PageQuery>,
) -> ApiResult<Json<Paged<LeaveRequest>>> {
    let page = PageParams { page: q.page, per_page: q.per_page };
    Ok(Json(service::students::history(&core, &p, id, page).await?))
}
