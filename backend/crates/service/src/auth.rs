use crate::{context::Core, crypto};
use chrono::{DateTime, Duration, Utc};
use domain::{
    error::{DomainError, DomainResult},
    models::{SessionInfo, UserProfile},
    principal::Principal,
    validation::validate_password,
};
use repository::{audit, db_err, sessions, users};
use serde_json::json;
use uuid::Uuid;

pub struct LoginOutput {
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub must_change_password: bool,
}

pub async fn login(core: &Core, login: &str, password: &str) -> DomainResult<LoginOutput> {
    let login = login.trim();
    if login.is_empty() || password.is_empty() {
        return Err(DomainError::Validation("login and password are required".into()));
    }
    let creds = users::find_credentials(&core.pool, login).await?;
    let creds = match creds {
        Some(c) => {
            let ok = crypto::verify_password(password.to_owned(), c.password_hash.clone()).await?;
            if ok && c.status == "active" { Some(c) } else { None }
        }
        None => {
            crypto::burn_password_time(password.to_owned()).await;
            None
        }
    };
    // One generic error for unknown user, wrong password and disabled account.
    let creds = creds.ok_or(DomainError::Unauthenticated)?;

    let token = crypto::new_token();
    let expires_at = Utc::now() + Duration::hours(core.settings.session_ttl_hours);
    let session_id = sessions::insert(&core.pool, creds.user_id, &crypto::hash_token(&token), expires_at).await?;
    audit::insert(&core.pool, Some(creds.user_id), "auth.login", "session", Some(session_id), json!({})).await?;

    let profile = users::get_profile(&core.pool, creds.user_id).await?.ok_or(DomainError::Unauthenticated)?;
    Ok(LoginOutput { token, expires_at, must_change_password: profile.must_change_password })
}

pub async fn authenticate(core: &Core, token: &str) -> DomainResult<Principal> {
    let (session_id, user_id) = sessions::find_active(&core.pool, &crypto::hash_token(token))
        .await?
        .ok_or(DomainError::Unauthenticated)?;
    users::load_principal(&core.pool, user_id, session_id).await
}

pub async fn logout(core: &Core, actor: &Principal) -> DomainResult<()> {
    sessions::revoke_one(&core.pool, actor.user_id, actor.session_id).await?;
    audit::insert(&core.pool, Some(actor.user_id), "auth.logout", "session", Some(actor.session_id), json!({})).await
}

pub async fn me(core: &Core, actor: &Principal) -> DomainResult<UserProfile> {
    users::get_profile(&core.pool, actor.user_id).await?.ok_or(DomainError::Unauthenticated)
}

pub async fn change_password(core: &Core, actor: &Principal, current: &str, new: &str) -> DomainResult<()> {
    validate_password(new)?;
    if current == new {
        return Err(DomainError::Validation("new password must differ from the current one".into()));
    }
    let stored = users::get_password_hash(&core.pool, actor.user_id).await?;
    if !crypto::verify_password(current.to_owned(), stored).await? {
        // Wrong *current* password: the caller is authenticated, so 422 not 401.
        return Err(DomainError::Validation("current password is incorrect".into()));
    }
    let hash = crypto::hash_password(new.to_owned()).await?;
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    users::update_password(&mut *tx, actor.user_id, &hash, false).await?;
    // Every other device is signed out; this session stays valid.
    sessions::revoke_all(&mut *tx, actor.user_id, Some(actor.session_id)).await?;
    audit::insert(&mut *tx, Some(actor.user_id), "auth.change_password", "user", Some(actor.user_id), json!({})).await?;
    tx.commit().await.map_err(db_err)
}

pub async fn list_sessions(core: &Core, actor: &Principal) -> DomainResult<Vec<SessionInfo>> {
    sessions::list_for_user(&core.pool, actor.user_id).await
}

pub async fn revoke_session(core: &Core, actor: &Principal, session_id: Uuid) -> DomainResult<()> {
    // Scoped to the caller's own sessions; someone else's id looks like "not found".
    match sessions::revoke_one(&core.pool, actor.user_id, session_id).await? {
        0 => Err(DomainError::NotFound),
        _ => audit::insert(&core.pool, Some(actor.user_id), "auth.revoke_session", "session", Some(session_id), json!({})).await,
    }
}
