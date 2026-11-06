use crate::{context::Core, crypto};
use chrono::{DateTime, Duration, Utc};
use domain::{
    error::{DomainError, DomainResult},
    models::{ForgotPasswordRequest, ResetPasswordRequest, SessionInfo, UserProfile},
    principal::Principal,
    validation::validate_password,
};
use repository::{audit, db_err, password_resets, sessions, users};
use serde_json::json;
use sqlx;
use uuid::Uuid;

pub struct LoginOutput {
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub must_change_password: bool,
}

pub struct ForgotPasswordOutput {
    /// Only populated when `PASSWORD_RESET_EXPOSE_TOKEN` is deliberately enabled
    /// for local development. Production deployments must deliver the token out of band.
    pub token: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

pub async fn login(core: &Core, login: &str, password: &str) -> DomainResult<LoginOutput> {
    let login = login.trim();
    if login.is_empty() || password.is_empty() {
        return Err(DomainError::Validation(
            "login and password are required".into(),
        ));
    }
    let creds = users::find_credentials(&core.pool, login).await?;
    let creds = match creds {
        Some(c) => {
            let ok = crypto::verify_password(password.to_owned(), c.password_hash.clone()).await?;
            if ok && c.status == "active" {
                Some(c)
            } else {
                None
            }
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
    let session_id = sessions::insert(
        &core.pool,
        creds.user_id,
        &crypto::hash_token(&token),
        expires_at,
    )
    .await?;
    audit::insert(
        &core.pool,
        Some(creds.user_id),
        "auth.login",
        "session",
        Some(session_id),
        json!({}),
    )
    .await?;

    let profile = users::get_profile(&core.pool, creds.user_id)
        .await?
        .ok_or(DomainError::Unauthenticated)?;
    Ok(LoginOutput {
        token,
        expires_at,
        must_change_password: profile.must_change_password,
    })
}

pub async fn authenticate(core: &Core, token: &str) -> DomainResult<Principal> {
    let (session_id, user_id) = sessions::find_active(&core.pool, &crypto::hash_token(token))
        .await?
        .ok_or(DomainError::Unauthenticated)?;
    users::load_principal(&core.pool, user_id, session_id).await
}

pub async fn logout(core: &Core, actor: &Principal) -> DomainResult<()> {
    sessions::revoke_one(&core.pool, actor.user_id, actor.session_id).await?;
    audit::insert(
        &core.pool,
        Some(actor.user_id),
        "auth.logout",
        "session",
        Some(actor.session_id),
        json!({}),
    )
    .await
}

pub async fn me(core: &Core, actor: &Principal) -> DomainResult<UserProfile> {
    users::get_profile(&core.pool, actor.user_id)
        .await?
        .ok_or(DomainError::Unauthenticated)
}

pub async fn change_password(
    core: &Core,
    actor: &Principal,
    current: &str,
    new: &str,
) -> DomainResult<()> {
    validate_password(new)?;
    if current == new {
        return Err(DomainError::Validation(
            "new password must differ from the current one".into(),
        ));
    }
    let stored = users::get_password_hash(&core.pool, actor.user_id).await?;
    if !crypto::verify_password(current.to_owned(), stored).await? {
        // Wrong *current* password: the caller is authenticated, so 422 not 401.
        return Err(DomainError::Validation(
            "current password is incorrect".into(),
        ));
    }
    let hash = crypto::hash_password(new.to_owned()).await?;
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    users::update_password(&mut *tx, actor.user_id, &hash, false).await?;
    // Every other device is signed out; this session stays valid.
    sessions::revoke_all(&mut *tx, actor.user_id, Some(actor.session_id)).await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "auth.change_password",
        "user",
        Some(actor.user_id),
        json!({}),
    )
    .await?;
    tx.commit().await.map_err(db_err)
}

pub async fn list_sessions(core: &Core, actor: &Principal) -> DomainResult<Vec<SessionInfo>> {
    sessions::list_for_user(&core.pool, actor.user_id, actor.session_id).await
}

pub async fn revoke_session(core: &Core, actor: &Principal, session_id: Uuid) -> DomainResult<()> {
    // Scoped to the caller's own sessions; someone else's id looks like "not found".
    match sessions::revoke_one(&core.pool, actor.user_id, session_id).await? {
        0 => Err(DomainError::NotFound),
        _ => {
            audit::insert(
                &core.pool,
                Some(actor.user_id),
                "auth.revoke_session",
                "session",
                Some(session_id),
                json!({}),
            )
            .await
        }
    }
}

pub async fn forgot_password(
    core: &Core,
    req: ForgotPasswordRequest,
) -> DomainResult<ForgotPasswordOutput> {
    let email = req.email.trim().to_lowercase();
    if email.is_empty() {
        return Err(DomainError::Validation("email is required".into()));
    }

    let user = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM users WHERE lower(email) = $1 AND status = 'active'",
    )
    .bind(&email)
    .fetch_optional(&core.pool)
    .await
    .map_err(db_err)?;

    let Some(user_id) = user else {
        // The response is identical for unknown accounts so recovery cannot be
        // used to enumerate users.
        return Ok(ForgotPasswordOutput {
            token: None,
            expires_at: None,
        });
    };

    let token = crypto::new_token();
    let expires_at = Utc::now() + Duration::minutes(core.settings.password_reset_token_ttl_minutes);

    password_resets::delete_all_for_user(&core.pool, user_id).await?;
    password_resets::insert_token(&core.pool, user_id, &crypto::hash_token(&token), expires_at)
        .await?;
    audit::insert(
        &core.pool,
        Some(user_id),
        "auth.password_reset_requested",
        "user",
        Some(user_id),
        json!({}),
    )
    .await?;

    // Deliver the recovery token out-of-band. The mock adapter records it in
    // memory; the SMTP adapter sends it by email. The token is never logged.
    let base = core
        .settings
        .app_base_url
        .clone()
        .unwrap_or_else(|| "http://localhost:5173".to_string());
    let body = format!(
        "A password reset was requested for your account.\n\n\
         Reset token: {token}\n\n\
         You can also open: {base}/reset-password?token={token}\n\n\
         This link expires at {expires_at}. If you did not request this, ignore this message."
    );
    if let Err(err) = core
        .email
        .send(&email, "Password reset request", &body)
        .await
    {
        tracing::warn!("password reset email delivery failed: {err}");
    }

    Ok(ForgotPasswordOutput {
        token: core.settings.password_reset_expose_token.then_some(token),
        expires_at: Some(expires_at),
    })
}

pub async fn reset_password(core: &Core, req: ResetPasswordRequest) -> DomainResult<()> {
    validate_password(&req.new_password)?;

    let token_hash = crypto::hash_token(&req.token);
    let hash = crypto::hash_password(req.new_password.to_owned()).await?;

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let user_id = password_resets::consume_token(&mut *tx, &token_hash)
        .await?
        .ok_or(DomainError::Unauthenticated)?;
    users::update_password(&mut *tx, user_id, &hash, false).await?;
    // A recovered account is signed out everywhere, including devices that may
    // have been compromised.
    password_resets::delete_all_for_user(&mut *tx, user_id).await?;
    sessions::revoke_all(&mut *tx, user_id, None).await?;
    audit::insert(
        &mut *tx,
        Some(user_id),
        "auth.reset_password",
        "user",
        Some(user_id),
        json!({}),
    )
    .await?;
    tx.commit().await.map_err(db_err)
}
