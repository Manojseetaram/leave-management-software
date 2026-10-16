use crate::{error::ApiError, AppState};
use async_trait::async_trait;
use axum::{
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts},
};
use domain::{error::DomainError, principal::Principal};

async fn principal_from_parts(parts: &Parts, state: &AppState) -> Result<Principal, ApiError> {
    let token = parts
        .headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .ok_or(DomainError::Unauthenticated)?;
    Ok(service::auth::authenticate(state, token).await?)
}

/// Authenticated caller. Rejected with 403 `password_change_required` while the
/// temporary password is still in use.
pub struct AuthUser(pub Principal);

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = ApiError;
    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let p = principal_from_parts(parts, state).await?;
        if p.must_change_password {
            return Err(DomainError::PasswordChangeRequired.into());
        }
        Ok(AuthUser(p))
    }
}

/// Same, but allowed while a password change is pending
/// (used only by /auth/me, /auth/logout and /auth/change-password).
pub struct AuthUserAllowTemp(pub Principal);

#[async_trait]
impl FromRequestParts<AppState> for AuthUserAllowTemp {
    type Rejection = ApiError;
    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        Ok(AuthUserAllowTemp(principal_from_parts(parts, state).await?))
    }
}
