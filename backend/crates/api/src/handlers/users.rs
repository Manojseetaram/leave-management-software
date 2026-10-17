use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{extract::State, http::StatusCode, Json};
use domain::models::NewStaffUser;
use service::users::CreatedStaff;

pub async fn create(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Json(body): Json<NewStaffUser>,
) -> ApiResult<(StatusCode, Json<CreatedStaff>)> {
    Ok((
        StatusCode::CREATED,
        Json(service::users::create_staff(&core, &p, body).await?),
    ))
}
