mod common;
use axum::http::{Method, StatusCode};
use common::*;
use serde_json::json;
use sqlx::PgPool;

#[sqlx::test(migrations = "./migrations")]
async fn hod_creates_student_who_can_log_in_with_register_number(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let (s, b) = t
        .post("/api/v1/students", &hod, json!({"register_number": "1ab22is001", "full_name": "Asha K", "email": "Asha@College.edu", "semester": 5}))
        .await;
    assert_eq!(s, StatusCode::CREATED);
    assert_eq!(b["student"]["register_number"], "1AB22IS001", "stored upper-case");
    assert_eq!(b["student"]["email"], "asha@college.edu", "stored lower-case");
    assert_eq!(b["student"]["department"], "ISE");
    let temp = b["temporary_password"].as_str().unwrap();
    assert_eq!(temp.len(), 16);

    // The temporary password is only stored hashed.
    let hash: String = sqlx::query_scalar("SELECT password_hash FROM users WHERE email = 'asha@college.edu'")
        .fetch_one(&t.core.pool).await.unwrap();
    assert!(hash.starts_with("$argon2id$") && !hash.contains(temp));

    let (s, b) = t.call(Method::POST, "/api/v1/auth/login", None, Some(json!({"login": "1AB22IS001", "password": temp}))).await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(b["must_change_password"], true);
}

#[sqlx::test(migrations = "./migrations")]
async fn student_creation_validates_input_and_rejects_duplicates(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let bad = [
        json!({"register_number": "x", "full_name": "A", "semester": 5}),
        json!({"register_number": "1AB22IS002", "full_name": "  ", "semester": 5}),
        json!({"register_number": "1AB22IS002", "full_name": "A", "semester": 13}),
        json!({"register_number": "1AB22IS002", "full_name": "A", "semester": 5, "email": "not-an-email"}),
    ];
    for body in bad {
        assert_eq!(t.post("/api/v1/students", &hod, body.clone()).await.0, StatusCode::UNPROCESSABLE_ENTITY, "{body}");
    }
    let ok = json!({"register_number": "1AB22IS003", "full_name": "A", "semester": 5});
    assert_eq!(t.post("/api/v1/students", &hod, ok.clone()).await.0, StatusCode::CREATED);
    assert_eq!(t.post("/api/v1/students", &hod, ok).await.0, StatusCode::CONFLICT);
}

#[sqlx::test(migrations = "./migrations")]
async fn students_cannot_manage_other_students_or_staff_accounts(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let asha = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let ravi = t.create_student(&hod, "1AB22IS002", "Ravi P").await;

    // Student cannot list, create, update, deactivate or create staff.
    assert_eq!(t.get("/api/v1/students", &asha.token).await.0, StatusCode::FORBIDDEN);
    assert_eq!(t.post("/api/v1/students", &asha.token, json!({"register_number": "1AB22IS009", "full_name": "X", "semester": 1})).await.0, StatusCode::FORBIDDEN);
    let (s, _) = t.call(Method::PATCH, &format!("/api/v1/students/{}", asha.id), Some(&asha.token), Some(json!({"semester": 8}))).await;
    assert_eq!(s, StatusCode::FORBIDDEN);
    let (s, _) = t.call(Method::DELETE, &format!("/api/v1/students/{}", asha.id), Some(&asha.token), None).await;
    assert_eq!(s, StatusCode::FORBIDDEN);
    let (s, _) = t.post("/api/v1/users", &asha.token, json!({"email": "x@y.edu", "full_name": "X", "roles": ["hod"]})).await;
    assert_eq!(s, StatusCode::FORBIDDEN);

    // Own record: yes. Another student's: 404 (existence is not revealed).
    assert_eq!(t.get(&format!("/api/v1/students/{}", asha.id), &asha.token).await.0, StatusCode::OK);
    assert_eq!(t.get(&format!("/api/v1/students/{}", ravi.id), &asha.token).await.0, StatusCode::NOT_FOUND);
    assert_eq!(t.get(&format!("/api/v1/students/{}/parents", ravi.id), &asha.token).await.0, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrations = "./migrations")]
async fn hod_cannot_create_staff_but_admin_can(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let (s, _) = t.post("/api/v1/users", &hod, json!({"email": "f@college.edu", "full_name": "F", "roles": ["faculty"]})).await;
    assert_eq!(s, StatusCode::FORBIDDEN);
    let admin = t.admin_token().await;
    let (s, _) = t.post("/api/v1/users", &admin, json!({"email": "f@college.edu", "full_name": "F", "roles": ["faculty"]})).await;
    assert_eq!(s, StatusCode::CREATED);
    // Students cannot be minted through the staff endpoint, nor unknown roles.
    for roles in [json!(["student"]), json!(["root"]), json!([])] {
        let (s, _) = t.post("/api/v1/users", &admin, json!({"email": "g@college.edu", "full_name": "G", "roles": roles})).await;
        assert_eq!(s, StatusCode::UNPROCESSABLE_ENTITY);
    }
}

#[sqlx::test(migrations = "./migrations")]
async fn list_search_filter_and_paginate(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    for (reg, name) in [("1AB22IS001", "Asha K"), ("1AB22IS002", "Ravi P"), ("1AB22IS003", "Asha M")] {
        let (s, _) = t.post("/api/v1/students", &hod, json!({"register_number": reg, "full_name": name, "semester": 5})).await;
        assert_eq!(s, StatusCode::CREATED);
    }
    let (_, b) = t.get("/api/v1/students?per_page=2&page=1", &hod).await;
    assert_eq!((b["items"].as_array().unwrap().len(), b["total"].as_i64().unwrap()), (2, 3));
    let (_, b) = t.get("/api/v1/students?per_page=2&page=2", &hod).await;
    assert_eq!(b["items"].as_array().unwrap().len(), 1);
    let (_, b) = t.get("/api/v1/students?q=asha", &hod).await;
    assert_eq!(b["total"], 2);
    let (_, b) = t.get("/api/v1/students?q=IS002", &hod).await;
    assert_eq!(b["items"][0]["full_name"], "Ravi P");
    // LIKE wildcards in the search term are escaped, not interpreted.
    let (_, b) = t.get("/api/v1/students?q=%25", &hod).await;
    assert_eq!(b["total"], 0);
    assert_eq!(t.get("/api/v1/students?status=bogus", &hod).await.0, StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test(migrations = "./migrations")]
async fn update_student_changes_permitted_fields_only(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let (s, b) = t.call(Method::PATCH, &format!("/api/v1/students/{}", st.id), Some(&hod), Some(json!({"semester": 6, "full_name": "Asha Kumar", "section": "B"}))).await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!((b["semester"].clone(), b["full_name"].clone(), b["section"].clone()), (json!(6), json!("Asha Kumar"), json!("B")));
    assert_eq!(b["register_number"], "1AB22IS001", "register number is immutable");
    let (s, _) = t.call(Method::PATCH, &format!("/api/v1/students/{}", st.id), Some(&hod), Some(json!({"status": "archived"}))).await;
    assert_eq!(s, StatusCode::UNPROCESSABLE_ENTITY, "archiving must go through DELETE");
}

#[sqlx::test(migrations = "./migrations")]
async fn deactivate_blocks_login_keeps_history_and_restore_reopens(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let req_id = t.submitted_request(&st.token).await;

    let (s, b) = t.call(Method::DELETE, &format!("/api/v1/students/{}", st.id), Some(&hod), None).await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(b["status"], "archived");
    assert!(!b["deleted_at"].is_null());

    // Existing session is dead; fresh login is refused.
    assert_eq!(t.get("/api/v1/auth/me", &st.token).await.0, StatusCode::UNAUTHORIZED);
    let (s, _) = t.call(Method::POST, "/api/v1/auth/login", None, Some(json!({"login": "1AB22IS001", "password": NEW_PASSWORD}))).await;
    assert_eq!(s, StatusCode::UNAUTHORIZED);

    // Hidden from the default list, visible when asked for, and the history survives.
    assert_eq!(t.get("/api/v1/students", &hod).await.1["total"], 0);
    assert_eq!(t.get("/api/v1/students?status=archived", &hod).await.1["total"], 1);
    let (s, b) = t.get(&format!("/api/v1/students/{}/history", st.id), &hod).await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(b["items"][0]["id"], req_id.as_str());

    // Double deactivation conflicts; restore works and login returns.
    let (s, _) = t.call(Method::DELETE, &format!("/api/v1/students/{}", st.id), Some(&hod), None).await;
    assert_eq!(s, StatusCode::CONFLICT);
    let (s, b) = t.post(&format!("/api/v1/students/{}/restore", st.id), &hod, json!({})).await;
    assert_eq!((s, b["status"].clone()), (StatusCode::OK, json!("active")));
    let (s, _) = t.call(Method::POST, "/api/v1/auth/login", None, Some(json!({"login": "1AB22IS001", "password": NEW_PASSWORD}))).await;
    assert_eq!(s, StatusCode::OK);
}

#[sqlx::test(migrations = "./migrations")]
async fn reset_password_issues_new_temp_password_and_signs_student_out(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let (s, b) = t.post(&format!("/api/v1/students/{}/reset-password", st.id), &hod, json!({})).await;
    assert_eq!(s, StatusCode::OK);
    let temp = b["temporary_password"].as_str().unwrap().to_string();

    assert_eq!(t.get("/api/v1/auth/me", &st.token).await.0, StatusCode::UNAUTHORIZED);
    let (s, _) = t.call(Method::POST, "/api/v1/auth/login", None, Some(json!({"login": "1AB22IS001", "password": NEW_PASSWORD}))).await;
    assert_eq!(s, StatusCode::UNAUTHORIZED, "old password must stop working");
    let (s, b) = t.call(Method::POST, "/api/v1/auth/login", None, Some(json!({"login": "1AB22IS001", "password": temp}))).await;
    assert_eq!((s, b["must_change_password"].clone()), (StatusCode::OK, json!(true)));
}

#[sqlx::test(migrations = "./migrations")]
async fn staff_actions_are_audited(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    t.call(Method::DELETE, &format!("/api/v1/students/{}", st.id), Some(&hod), None).await;

    let (s, b) = t.get("/api/v1/admin/audit-logs?entity_type=student", &hod).await;
    assert_eq!(s, StatusCode::OK);
    let actions: Vec<&str> = b["items"].as_array().unwrap().iter().map(|e| e["action"].as_str().unwrap()).collect();
    assert!(actions.contains(&"student.create") && actions.contains(&"student.deactivate"), "{actions:?}");
    // Students cannot read the audit log.
    let other = t.create_student(&hod, "1AB22IS002", "Ravi P").await;
    assert_eq!(t.get("/api/v1/admin/audit-logs", &other.token).await.0, StatusCode::FORBIDDEN);
    // And the log never stores passwords.
    let dump: String = sqlx::query_scalar("SELECT string_agg(metadata::text, ' ') FROM audit_logs").fetch_one(&t.core.pool).await.unwrap();
    assert!(!dump.contains(NEW_PASSWORD) && !dump.contains("password\""));
}
