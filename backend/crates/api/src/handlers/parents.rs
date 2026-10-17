use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use domain::models::{NewParent, ParentContact};
use serde_json::{json, Value};
use uuid::Uuid;

pub async fn create(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Json(body): Json<NewParent>,
) -> ApiResult<(StatusCode, Json<ParentContact>)> {
    Ok((
        StatusCode::CREATED,
        Json(service::parents::add(&core, &p, body).await?),
    ))
}

pub async fn verify(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ParentContact>> {
    Ok(Json(service::parents::verify(&core, &p, id).await?))
}

pub async fn list_for_student(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<Value>> {
    Ok(Json(
        json!({ "items": service::parents::list_for_student(&core, &p, id).await? }),
    ))
}
