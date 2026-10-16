use crate::{
    error::ApiResult,
    extractors::{AuthUser, AuthUserAllowTemp},
    AppState,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct LoginBody {
    /// Email (staff) or register number (students).
    pub login: String,
    pub password: String,
}

pub async fn login(State(core): State<AppState>, Json(b): Json<LoginBody>) -> ApiResult<Json<Value>> {
    let out = service::auth::login(&core, &b.login, &b.password).await?;
    Ok(Json(json!({
        "token": out.token,
        "token_type": "Bearer",
        "expires_at": out.expires_at,
        "must_change_password": out.must_change_password,
    })))
}

pub async fn logout(State(core): State<AppState>, AuthUserAllowTemp(p): AuthUserAllowTemp) -> ApiResult<StatusCode> {
    service::auth::logout(&core, &p).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn me(State(core): State<AppState>, AuthUserAllowTemp(p): AuthUserAllowTemp) -> ApiResult<Json<Value>> {
    let user = service::auth::me(&core, &p).await?;
    Ok(Json(json!({ "user": user, "roles": p.roles, "student_id": p.student_id })))
}

#[derive(Deserialize)]
pub struct ChangePasswordBody {
    pub current_password: String,
    pub new_password: String,
}

pub async fn change_password(
    State(core): State<AppState>,
    AuthUserAllowTemp(p): AuthUserAllowTemp,
    Json(b): Json<ChangePasswordBody>,
) -> ApiResult<StatusCode> {
    service::auth::change_password(&core, &p, &b.current_password, &b.new_password).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn sessions(State(core): State<AppState>, AuthUser(p): AuthUser) -> ApiResult<Json<Value>> {
    Ok(Json(json!({ "items": service::auth::list_sessions(&core, &p).await? })))
}

pub async fn revoke_session(State(core): State<AppState>, AuthUser(p): AuthUser, Path(id): Path<Uuid>) -> ApiResult<StatusCode> {
    service::auth::revoke_session(&core, &p, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
