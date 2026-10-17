mod common;
use axum::http::{Method, StatusCode};
use common::*;
use serde_json::json;
use sqlx::PgPool;

#[sqlx::test(migrations = "./migrations")]
async fn health_endpoints_work_without_auth(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let (s, _) = t.call(Method::GET, "/api/v1/health/live", None, None).await;
    assert_eq!(s, StatusCode::OK);
    let (s, b) = t
        .call(Method::GET, "/api/v1/health/ready", None, None)
        .await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(b["database"], "ok");
}

#[sqlx::test(migrations = "./migrations")]
async fn protected_routes_require_a_valid_token(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let (s, _) = t.call(Method::GET, "/api/v1/students", None, None).await;
    assert_eq!(s, StatusCode::UNAUTHORIZED);
    let (s, _) = t.get("/api/v1/students", "not-a-real-token").await;
    assert_eq!(s, StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "./migrations")]
async fn login_failures_are_indistinguishable(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let wrong_pw = t
        .call(
            Method::POST,
            "/api/v1/auth/login",
            None,
            Some(json!({"login": ADMIN_EMAIL, "password": "nope-nope-nope"})),
        )
        .await;
    let unknown = t
        .call(
            Method::POST,
            "/api/v1/auth/login",
            None,
            Some(json!({"login": "ghost@college.edu", "password": "nope-nope-nope"})),
        )
        .await;
    assert_eq!(wrong_pw.0, StatusCode::UNAUTHORIZED);
    assert_eq!(
        wrong_pw, unknown,
        "response must not reveal whether the account exists"
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn temporary_password_blocks_everything_until_changed(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let (s, b) = t
        .call(
            Method::POST,
            "/api/v1/auth/login",
            None,
            Some(json!({"login": ADMIN_EMAIL, "password": ADMIN_PASSWORD})),
        )
        .await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(b["must_change_password"], true);
    let token = b["token"].as_str().unwrap();

    let (s, b) = t.get("/api/v1/students", token).await;
    assert_eq!(s, StatusCode::FORBIDDEN);
    assert_eq!(b["error"]["code"], "password_change_required");
    // /auth/me is still allowed so the UI can show the change-password screen.
    assert_eq!(t.get("/api/v1/auth/me", token).await.0, StatusCode::OK);

    // Weak or unchanged passwords are rejected.
    let weak = t
        .post(
            "/api/v1/auth/change-password",
            token,
            json!({"current_password": ADMIN_PASSWORD, "new_password": "short"}),
        )
        .await;
    assert_eq!(weak.0, StatusCode::UNPROCESSABLE_ENTITY);
    let same = t
        .post(
            "/api/v1/auth/change-password",
            token,
            json!({"current_password": ADMIN_PASSWORD, "new_password": ADMIN_PASSWORD}),
        )
        .await;
    assert_eq!(same.0, StatusCode::UNPROCESSABLE_ENTITY);
    let wrong = t
        .post(
            "/api/v1/auth/change-password",
            token,
            json!({"current_password": "incorrect-one", "new_password": NEW_PASSWORD}),
        )
        .await;
    assert_eq!(wrong.0, StatusCode::UNPROCESSABLE_ENTITY);

    let ok = t
        .post(
            "/api/v1/auth/change-password",
            token,
            json!({"current_password": ADMIN_PASSWORD, "new_password": NEW_PASSWORD}),
        )
        .await;
    assert_eq!(ok.0, StatusCode::NO_CONTENT);
    assert_eq!(t.get("/api/v1/students", token).await.0, StatusCode::OK);

    // Old password no longer works, new one does.
    let old = t
        .call(
            Method::POST,
            "/api/v1/auth/login",
            None,
            Some(json!({"login": ADMIN_EMAIL, "password": ADMIN_PASSWORD})),
        )
        .await;
    assert_eq!(old.0, StatusCode::UNAUTHORIZED);
    let new = t
        .call(
            Method::POST,
            "/api/v1/auth/login",
            None,
            Some(json!({"login": ADMIN_EMAIL, "password": NEW_PASSWORD})),
        )
        .await;
    assert_eq!(new.0, StatusCode::OK);
}

#[sqlx::test(migrations = "./migrations")]
async fn logout_revokes_the_session(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let token = t.admin_token().await;
    assert_eq!(t.get("/api/v1/auth/me", &token).await.0, StatusCode::OK);
    let (s, _) = t
        .call(Method::POST, "/api/v1/auth/logout", Some(&token), None)
        .await;
    assert_eq!(s, StatusCode::NO_CONTENT);
    assert_eq!(
        t.get("/api/v1/auth/me", &token).await.0,
        StatusCode::UNAUTHORIZED
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn password_change_signs_out_other_sessions_and_sessions_can_be_revoked(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let first = t.admin_token().await; // login + change password
    let (_, b) = t
        .call(
            Method::POST,
            "/api/v1/auth/login",
            None,
            Some(json!({"login": ADMIN_EMAIL, "password": NEW_PASSWORD})),
        )
        .await;
    let second = b["token"].as_str().unwrap().to_string();

    let (s, b) = t.get("/api/v1/auth/sessions", &first).await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(b["items"].as_array().unwrap().len(), 2);

    // Revoke the other session by id.
    let other_id = b["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|x| x["id"].as_str().unwrap().to_string())
        .find(|id| !id.is_empty())
        .unwrap();
    let (s, _) = t
        .call(
            Method::DELETE,
            &format!("/api/v1/auth/sessions/{other_id}"),
            Some(&first),
            None,
        )
        .await;
    assert_eq!(s, StatusCode::NO_CONTENT);
    let (still_ok, gone) = (
        t.get("/api/v1/auth/me", &first).await.0,
        t.get("/api/v1/auth/me", &second).await.0,
    );
    assert!(
        (still_ok == StatusCode::OK) ^ (gone == StatusCode::OK),
        "exactly one of the two sessions must have been revoked"
    );

    // Unknown session id -> 404.
    let (s, _) = t
        .call(
            Method::DELETE,
            &format!("/api/v1/auth/sessions/{}", uuid::Uuid::new_v4()),
            Some(&first),
            None,
        )
        .await;
    assert_eq!(s, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrations = "./migrations")]
async fn bootstrap_only_runs_on_an_empty_database(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let again =
        service::users::bootstrap_admin(&t.core, "other@college.edu", "Another-Pass-1", "X")
            .await
            .unwrap();
    assert!(!again);
}
