use crate::{context::Core, crypto};
use domain::{
    error::{DomainError, DomainResult},
    models::{NewStaffUser, UserProfile},
    principal::{Principal, Role},
    validation::{require_text, validate_email, validate_password},
};
use repository::{audit, db_err, users};
use serde::Serialize;
use serde_json::json;

#[derive(Debug, Serialize)]
pub struct CreatedStaff {
    pub user: UserProfile,
    pub roles: Vec<Role>,
    /// Shown exactly once. Only its Argon2id hash is stored.
    pub temporary_password: String,
}

pub async fn create_staff(core: &Core, actor: &Principal, input: NewStaffUser) -> DomainResult<CreatedStaff> {
    if !actor.has_role(Role::Admin) {
        return Err(DomainError::Forbidden);
    }
    let email = validate_email(&input.email)?;
    let name = require_text("full_name", &input.full_name, 120)?;
    let mut roles = Vec::new();
    for r in &input.roles {
        match Role::parse(r) {
            Some(Role::Student) | None => {
                return Err(DomainError::Validation(format!("role '{r}' cannot be assigned here")))
            }
            Some(role) if !roles.contains(&role) => roles.push(role),
            Some(_) => {}
        }
    }
    if roles.is_empty() {
        return Err(DomainError::Validation("at least one role is required".into()));
    }

    let temporary_password = crypto::temporary_password();
    let hash = crypto::hash_password(temporary_password.clone()).await?;
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let id = users::insert_user(&mut *tx, Some(&email), &hash, &name, true).await?;
    for role in &roles {
        users::assign_role(&mut *tx, id, *role).await?;
    }
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "user.create",
        "user",
        Some(id),
        json!({ "roles": roles.iter().map(Role::as_str).collect::<Vec<_>>() }),
    )
    .await?;
    let user = users::get_profile(&mut *tx, id).await?.ok_or(DomainError::NotFound)?;
    tx.commit().await.map_err(db_err)?;
    Ok(CreatedStaff { user, roles, temporary_password })
}

/// First-run helper: creates the initial admin only if there are no users at all.
pub async fn bootstrap_admin(core: &Core, email: &str, password: &str, full_name: &str) -> DomainResult<bool> {
    if users::count_users(&core.pool).await? > 0 {
        return Ok(false);
    }
    let email = validate_email(email)?;
    validate_password(password)?;
    let hash = crypto::hash_password(password.to_owned()).await?;
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let id = users::insert_user(&mut *tx, Some(&email), &hash, full_name, true).await?;
    users::assign_role(&mut *tx, id, Role::Admin).await?;
    audit::insert(&mut *tx, None, "user.bootstrap_admin", "user", Some(id), json!({})).await?;
    tx.commit().await.map_err(db_err)?;
    Ok(true)
}
