use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use domain::{
    leave::Action,
    models::{LeaveRequest, NewLeave, PageParams, Paged, UpdateLeave},
};
use serde::Deserialize;
use serde_json::{json, Value};
use service::leave::LeaveFilter;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ListQuery {
    pub status: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

/// Body for decisions. `comment` is mandatory for reject / request-changes.
#[derive(Deserialize, Default)]
pub struct CommentBody {
    pub comment: Option<String>,
}

pub async fn create(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Json(body): Json<NewLeave>,
) -> ApiResult<(StatusCode, Json<LeaveRequest>)> {
    Ok((StatusCode::CREATED, Json(service::leave::create(&core, &p, body).await?)))
}

pub async fn list(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<ListQuery>,
) -> ApiResult<Json<Paged<LeaveRequest>>> {
    let filter = LeaveFilter { status: q.status, page: PageParams { page: q.page, per_page: q.per_page } };
    Ok(Json(service::leave::list(&core, &p, filter).await?))
}

pub async fn show(State(core): State<AppState>, AuthUser(p): AuthUser, Path(id): Path<Uuid>) -> ApiResult<Json<LeaveRequest>> {
    Ok(Json(service::leave::get(&core, &p, id).await?))
}

pub async fn update(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateLeave>,
) -> ApiResult<Json<LeaveRequest>> {
    Ok(Json(service::leave::update(&core, &p, id, body).await?))
}

pub async fn history(State(core): State<AppState>, AuthUser(p): AuthUser, Path(id): Path<Uuid>) -> ApiResult<Json<Value>> {
    Ok(Json(json!({ "items": service::leave::history(&core, &p, id).await? })))
}

async fn act(core: AppState, p: domain::principal::Principal, id: Uuid, action: Action, body: Option<Json<CommentBody>>) -> ApiResult<Json<LeaveRequest>> {
    let comment = body.and_then(|Json(b)| b.comment);
    Ok(Json(service::leave::transition(&core, &p, id, action, comment).await?))
}

macro_rules! action_handler {
    ($name:ident, $action:expr) => {
        pub async fn $name(
            State(core): State<AppState>,
            AuthUser(p): AuthUser,
            Path(id): Path<Uuid>,
            body: Option<Json<CommentBody>>,
        ) -> ApiResult<Json<LeaveRequest>> {
            act(core, p, id, $action, body).await
        }
    };
}

action_handler!(submit, Action::Submit);
action_handler!(withdraw, Action::Withdraw);
action_handler!(approve, Action::Approve);
action_handler!(reject, Action::Reject);
action_handler!(request_changes, Action::RequestChanges);
action_handler!(complete, Action::Complete);
