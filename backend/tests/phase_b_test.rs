mod common;

use axum::http::{Method, StatusCode};
use common::*;
use serde_json::{json, Value};
use sqlx::PgPool;

#[sqlx::test(migrations = "./migrations")]
async fn password_recovery_rotates_password_and_revokes_sessions(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let old_token = t.admin_token().await;

    let (s, me) = t.get("/api/v1/auth/me", &old_token).await;
    assert_eq!(s, StatusCode::OK, "{me}");

    let (s, body) = t
        .call(
            Method::POST,
            "/api/v1/auth/forgot-password",
            None,
            Some(json!({"email": ADMIN_EMAIL})),
        )
        .await;
    assert_eq!(s, StatusCode::OK, "{body}");
    let reset_token = body["reset_token"]
        .as_str()
        .expect("test settings expose the recovery token")
        .to_string();

    let (s, body) = t
        .call(
            Method::POST,
            "/api/v1/auth/reset-password",
            None,
            Some(json!({
                "token": reset_token,
                "new_password": "Recovered-Pass-9"
            })),
        )
        .await;
    assert_eq!(s, StatusCode::NO_CONTENT, "{body}");

    let (s, _) = t.get("/api/v1/auth/me", &old_token).await;
    assert_eq!(s, StatusCode::UNAUTHORIZED, "all old sessions are revoked");

    let (s, body) = t
        .call(
            Method::POST,
            "/api/v1/auth/login",
            None,
            Some(json!({"login": ADMIN_EMAIL, "password": "Recovered-Pass-9"})),
        )
        .await;
    assert_eq!(s, StatusCode::OK, "{body}");

    let (s, _) = t
        .call(
            Method::POST,
            "/api/v1/auth/reset-password",
            None,
            Some(json!({
                "token": reset_token,
                "new_password": "Another-Pass-10"
            })),
        )
        .await;
    assert_eq!(s, StatusCode::UNAUTHORIZED, "tokens are single use");

    let (s, body) = t
        .call(
            Method::POST,
            "/api/v1/auth/forgot-password",
            None,
            Some(json!({"email": "nobody@college.edu"})),
        )
        .await;
    assert_eq!(s, StatusCode::OK);
    assert!(
        body["reset_token"].is_null(),
        "must not reveal unknown users"
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn credential_endpoints_are_rate_limited(pool: PgPool) {
    let t = TestApp::new_with_rates(pool, 2, 1).await;

    for _ in 0..2 {
        let (s, _) = t
            .call(
                Method::POST,
                "/api/v1/auth/login",
                None,
                Some(json!({"login": ADMIN_EMAIL, "password": "wrong-password"})),
            )
            .await;
        assert_eq!(s, StatusCode::UNAUTHORIZED);
    }
    let (s, body) = t
        .call(
            Method::POST,
            "/api/v1/auth/login",
            None,
            Some(json!({"login": ADMIN_EMAIL, "password": "wrong-password"})),
        )
        .await;
    assert_eq!(s, StatusCode::TOO_MANY_REQUESTS, "{body}");
    assert_eq!(body["error"]["code"], "rate_limited");

    let (s, _) = t
        .call(
            Method::POST,
            "/api/v1/auth/forgot-password",
            None,
            Some(json!({"email": ADMIN_EMAIL})),
        )
        .await;
    assert_eq!(s, StatusCode::OK);
    let (s, _) = t
        .call(
            Method::POST,
            "/api/v1/auth/forgot-password",
            None,
            Some(json!({"email": ADMIN_EMAIL})),
        )
        .await;
    assert_eq!(s, StatusCode::TOO_MANY_REQUESTS);
}

#[sqlx::test(migrations = "./migrations")]
async fn sessions_list_marks_the_current_session_and_can_be_revoked(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let token = t.admin_token().await;

    let (s, body) = t.get("/api/v1/auth/sessions", &token).await;
    assert_eq!(s, StatusCode::OK, "{body}");
    let current_id = body["current_session_id"].as_str().unwrap();
    assert!(body["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["id"] == current_id && item["current"] == true));

    let (s, body) = t
        .call(
            Method::DELETE,
            &format!("/api/v1/auth/sessions/{current_id}"),
            Some(&token),
            None,
        )
        .await;
    assert_eq!(s, StatusCode::NO_CONTENT, "{body}");
    let (s, _) = t.get("/api/v1/auth/me", &token).await;
    assert_eq!(s, StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "./migrations")]
async fn faculty_sees_only_permitted_reduced_fields(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let student = t.create_student(&hod, "1AB22IS101", "Asha K").await;
    let request_id = t.submitted_request(&student.token).await;
    let faculty = t.faculty_token().await;

    let (s, body) = t.get("/api/v1/faculty/students", &faculty).await;
    assert_eq!(s, StatusCode::OK, "{body}");
    let record = &body["items"][0];
    assert_eq!(record["register_number"], "1AB22IS101");
    assert!(record.get("email").is_none(), "faculty must not see email");

    let (s, body) = t.get("/api/v1/faculty/leave-requests", &faculty).await;
    assert_eq!(s, StatusCode::OK, "{body}");
    assert_eq!(body["total"], 1);
    let request = &body["items"][0];
    assert_eq!(request["id"], request_id);
    assert_eq!(request["status"], "pending");
    assert!(request.get("reason").is_none(), "no medical/leave detail");
    assert!(request.get("destination").is_none());

    let (s, _) = t.get("/api/v1/faculty/students", &student.token).await;
    assert_eq!(s, StatusCode::FORBIDDEN);
    let (s, _) = t.get("/api/v1/students", &faculty).await;
    assert_eq!(s, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrations = "./migrations")]
async fn bulk_import_reports_rows_and_only_returns_credentials_once(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;

    let rows = json!({
        "students": [
            {"register_number": "1AB22IS201", "full_name": "One", "semester": 5, "section": "A"},
            {"register_number": "1AB22IS202", "full_name": "Two", "semester": 5, "section": "B"},
            {"register_number": "1AB22IS201", "full_name": "Duplicate", "semester": 5},
            {"register_number": "1AB22IS203", "full_name": "", "semester": 5}
        ],
        "dry_run": true
    });
    let (s, body): (StatusCode, Value) = t.post("/api/v1/students/import", &hod, rows).await;
    assert_eq!(s, StatusCode::OK, "{body}");
    assert_eq!(body["dry_run"], true);
    assert_eq!(body["succeeded"], 2);
    assert_eq!(body["failed"], 2);
    assert!(body["rows"]
        .as_array()
        .unwrap()
        .iter()
        .all(|row| row.get("temporary_password").is_none()));

    // A bare array remains accepted for compatibility with the original route.
    let (s, body) = t
        .post(
            "/api/v1/students/import",
            &hod,
            json!([
                {"register_number": "1AB22IS201", "full_name": "One", "semester": 5, "section": "A"},
                {"register_number": "1AB22IS202", "full_name": "Two", "semester": 5, "section": "B"}
            ]),
        )
        .await;
    assert_eq!(s, StatusCode::OK, "{body}");
    assert_eq!(body["succeeded"], 2);
    let created = body["rows"]
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["register_number"] == "1AB22IS201")
        .unwrap();
    let temporary = created["temporary_password"].as_str().unwrap();
    t.onboard("1AB22IS201", temporary).await;

    let (s, body) = t
        .post(
            "/api/v1/students/import",
            &hod,
            json!([{"register_number": "1AB22IS201", "full_name": "Again", "semester": 5}]),
        )
        .await;
    assert_eq!(s, StatusCode::OK, "{body}");
    assert_eq!(body["failed"], 1);
    assert!(body["rows"][0]["error"]
        .as_str()
        .unwrap()
        .contains("exists"));

    let faculty = t.faculty_token().await;
    let (s, _) = t
        .post(
            "/api/v1/students/import",
            &faculty,
            json!([{"register_number": "1AB22IS999", "full_name": "No", "semester": 5}]),
        )
        .await;
    assert_eq!(s, StatusCode::FORBIDDEN);
}
