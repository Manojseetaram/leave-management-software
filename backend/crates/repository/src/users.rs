use crate::db_err;
use domain::{
    error::DomainResult,
    models::UserProfile,
    principal::{Principal, Role},
};
use sqlx::{PgExecutor, PgPool};
use uuid::Uuid;

#[derive(Debug, sqlx::FromRow)]
pub struct Credentials {
    pub user_id: Uuid,
    pub password_hash: String,
    pub status: String,
}

pub async fn insert_user<'e>(
    ex: impl PgExecutor<'e>,
    email: Option<&str>,
    password_hash: &str,
    full_name: &str,
    must_change_password: bool,
) -> DomainResult<Uuid> {
    sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO users (email, password_hash, full_name, must_change_password)
         VALUES ($1, $2, $3, $4) RETURNING id",
    )
    .bind(email)
    .bind(password_hash)
    .bind(full_name)
    .bind(must_change_password)
    .fetch_one(ex)
    .await
    .map_err(db_err)
}

pub async fn assign_role<'e>(ex: impl PgExecutor<'e>, user_id: Uuid, role: Role) -> DomainResult<()> {
    sqlx::query("INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = $2")
        .bind(user_id)
        .bind(role.as_str())
        .execute(ex)
        .await
        .map(|_| ())
        .map_err(db_err)
}

pub async fn count_users<'e>(ex: impl PgExecutor<'e>) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>("SELECT count(*) FROM users")
        .fetch_one(ex)
        .await
        .map_err(db_err)
}

/// Login is by email (staff) or register number (students).
pub async fn find_credentials<'e>(ex: impl PgExecutor<'e>, login: &str) -> DomainResult<Option<Credentials>> {
    sqlx::query_as::<_, Credentials>(
        "SELECT u.id AS user_id, u.password_hash, u.status
         FROM users u LEFT JOIN students s ON s.user_id = u.id
         WHERE lower(u.email) = lower($1) OR s.register_number = upper($1)
         LIMIT 1",
    )
    .bind(login)
    .fetch_optional(ex)
    .await
    .map_err(db_err)
}

pub async fn get_password_hash<'e>(ex: impl PgExecutor<'e>, user_id: Uuid) -> DomainResult<String> {
    sqlx::query_scalar::<_, String>("SELECT password_hash FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_one(ex)
        .await
        .map_err(db_err)
}

pub async fn update_password<'e>(
    ex: impl PgExecutor<'e>,
    user_id: Uuid,
    password_hash: &str,
    must_change_password: bool,
) -> DomainResult<()> {
    sqlx::query(
        "UPDATE users SET password_hash = $2, must_change_password = $3, updated_at = now() WHERE id = $1",
    )
    .bind(user_id)
    .bind(password_hash)
    .bind(must_change_password)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn set_status<'e>(ex: impl PgExecutor<'e>, user_id: Uuid, status: &str) -> DomainResult<()> {
    sqlx::query("UPDATE users SET status = $2, updated_at = now() WHERE id = $1")
        .bind(user_id)
        .bind(status)
        .execute(ex)
        .await
        .map(|_| ())
        .map_err(db_err)
}

pub async fn update_identity<'e>(
    ex: impl PgExecutor<'e>,
    user_id: Uuid,
    full_name: Option<&str>,
    email: Option<&str>,
) -> DomainResult<()> {
    sqlx::query(
        "UPDATE users SET full_name = COALESCE($2, full_name), email = COALESCE($3, email),
         updated_at = now() WHERE id = $1",
    )
    .bind(user_id)
    .bind(full_name)
    .bind(email)
    .execute(ex)
    .await
    .map(|_| ())
    .map_err(db_err)
}

pub async fn get_profile<'e>(ex: impl PgExecutor<'e>, user_id: Uuid) -> DomainResult<Option<UserProfile>> {
    sqlx::query_as::<_, UserProfile>(
        "SELECT id, email, full_name, status, must_change_password FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(ex)
    .await
    .map_err(db_err)
}

/// Rebuilt from the database on every request, so role changes and
/// deactivation take effect immediately.
pub async fn load_principal(pool: &PgPool, user_id: Uuid, session_id: Uuid) -> DomainResult<Principal> {
    let roles = sqlx::query_scalar::<_, String>(
        "SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(db_err)?
    .iter()
    .filter_map(|r| Role::parse(r))
    .collect();

    let student_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM students WHERE user_id = $1 AND deleted_at IS NULL",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(db_err)?;

    let must_change_password =
        sqlx::query_scalar::<_, bool>("SELECT must_change_password FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(pool)
            .await
            .map_err(db_err)?;

    Ok(Principal { user_id, session_id, roles, student_id, must_change_password })
}
