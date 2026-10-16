mod common;
use axum::http::StatusCode;
use common::*;
use serde_json::json;
use service::notifications::process_batch;
use sqlx::PgPool;

async fn statuses(t: &TestApp) -> Vec<(String, i32)> {
    sqlx::query_as::<_, (String, i32)>("SELECT status, attempt_count FROM notifications ORDER BY created_at")
        .fetch_all(&t.core.pool).await.unwrap()
}

#[sqlx::test(migrations = "./migrations")]
async fn parent_is_notified_on_submit_and_on_decision(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    t.add_verified_parent(&hod, st.id, "98765 43210").await;

    let id = t.submitted_request(&st.token).await;
    assert_eq!(process_batch(&t.core, 10).await.unwrap(), 1);
    let sent = t.sms.sent();
    assert_eq!(sent.len(), 1);
    assert_eq!(sent[0].to, "+919876543210", "decrypted and normalized before sending");
    assert!(sent[0].body.contains("Asha K (1AB22IS001)") && sent[0].body.contains("pending HOD approval"));
    assert!(sent[0].body.contains("10-01-2030 to 12-01-2030"));
    // Privacy: no reason or destination in the SMS.
    assert!(!sent[0].body.contains("Family function") && !sent[0].body.contains("Mysuru"));

    t.post(&format!("/api/v1/leave-requests/{id}/approve"), &hod, json!({})).await;
    assert_eq!(process_batch(&t.core, 10).await.unwrap(), 1);
    assert!(t.sms.sent()[1].body.contains("has been approved by the HOD"));

    let (_, b) = t.get("/api/v1/notifications", &hod).await;
    assert_eq!(b["total"], 2);
    assert_eq!(b["items"][0]["status"], "sent");
    assert!(b["items"][0]["provider_message_id"].as_str().unwrap().starts_with("mock-"));
}

#[sqlx::test(migrations = "./migrations")]
async fn rejection_sends_the_not_approved_message(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    t.add_verified_parent(&hod, st.id, "9876543210").await;
    let id = t.submitted_request(&st.token).await;
    t.post(&format!("/api/v1/leave-requests/{id}/reject"), &hod, json!({"comment": "Exams"})).await;
    process_batch(&t.core, 10).await.unwrap();
    let sent = t.sms.sent();
    assert_eq!(sent.len(), 2);
    assert!(sent[1].body.contains("was not approved"));
    assert!(!sent[1].body.contains("Exams"), "the rejection reason stays inside the portal");
}

#[sqlx::test(migrations = "./migrations")]
async fn no_sms_without_consent_and_verification(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;

    // Parent without consent cannot even be verified.
    let (s, b) = t.post("/api/v1/parents", &hod, json!({"student_id": st.id, "full_name": "P", "relationship": "mother", "phone": "9876543210", "sms_consent": false})).await;
    assert_eq!(s, StatusCode::CREATED);
    let (s, _) = t.post(&format!("/api/v1/parents/{}/verify", b["id"].as_str().unwrap()), &hod, json!({})).await;
    assert_eq!(s, StatusCode::CONFLICT);
    // Consenting but unverified parent.
    t.post("/api/v1/parents", &hod, json!({"student_id": st.id, "full_name": "Q", "relationship": "father", "phone": "9123456780", "sms_consent": true})).await;

    t.submitted_request(&st.token).await;
    assert_eq!(process_batch(&t.core, 10).await.unwrap(), 0);
    assert!(t.sms.sent().is_empty());
    assert!(statuses(&t).await.is_empty());
}

#[sqlx::test(migrations = "./migrations")]
async fn messages_are_never_sent_twice(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    t.add_verified_parent(&hod, st.id, "9876543210").await;
    let id: uuid::Uuid = t.submitted_request(&st.token).await.parse().unwrap();

    for _ in 0..3 {
        process_batch(&t.core, 10).await.unwrap();
    }
    assert_eq!(t.sms.sent().len(), 1, "repeated dispatcher ticks must not resend");

    // Re-enqueueing the same transition is a no-op (dedupe key).
    let added = repository::notifications::enqueue_for_request(&t.core.pool, id, "request_submitted").await.unwrap();
    assert_eq!(added, 0);
    assert_eq!(statuses(&t).await, vec![("sent".to_string(), 1)]);
}

#[sqlx::test(migrations = "./migrations")]
async fn failed_sms_is_retried_with_backoff_then_gives_up(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    t.add_verified_parent(&hod, st.id, "9876543210").await;
    t.sms.fail_next(1);
    t.submitted_request(&st.token).await;

    assert_eq!(process_batch(&t.core, 10).await.unwrap(), 1);
    assert_eq!(statuses(&t).await, vec![("failed".to_string(), 1)]);
    let err: String = sqlx::query_scalar("SELECT last_error FROM notifications").fetch_one(&t.core.pool).await.unwrap();
    assert_eq!(err, "mock gateway failure");

    // Backoff: not due yet, so the next tick leaves it alone.
    assert_eq!(process_batch(&t.core, 10).await.unwrap(), 0);
    sqlx::query("UPDATE notifications SET next_attempt_at = now()").execute(&t.core.pool).await.unwrap();
    assert_eq!(process_batch(&t.core, 10).await.unwrap(), 1);
    assert_eq!(statuses(&t).await, vec![("sent".to_string(), 2)]);
    assert_eq!(t.sms.sent().len(), 1);

    // A permanently failing gateway stops after max attempts (3 in tests).
    let (_, b) = t.get("/api/v1/leave-requests", &hod).await;
    let id = b["items"][0]["id"].as_str().unwrap().to_string();
    t.sms.fail_next(100);
    t.post(&format!("/api/v1/leave-requests/{id}/approve"), &hod, json!({})).await;
    for _ in 0..6 {
        sqlx::query("UPDATE notifications SET next_attempt_at = now()").execute(&t.core.pool).await.unwrap();
        process_batch(&t.core, 10).await.unwrap();
    }
    let last = statuses(&t).await.pop().unwrap();
    assert_eq!(last, ("failed".to_string(), 3), "stops retrying after sms_max_attempts");
}

#[sqlx::test(migrations = "./migrations")]
async fn parent_phone_is_encrypted_at_rest_and_never_returned(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let (s, b) = t.post("/api/v1/parents", &hod, json!({"student_id": st.id, "full_name": "P", "relationship": "father", "phone": "+91 98765-43210", "sms_consent": true})).await;
    assert_eq!(s, StatusCode::CREATED);
    assert!(!b.to_string().contains("9876543210"), "create response leaks the phone: {b}");
    let (_, list) = t.get(&format!("/api/v1/students/{}/parents", st.id), &hod).await;
    assert!(!list.to_string().contains("9876543210"));

    let raw: Vec<u8> = sqlx::query_scalar("SELECT phone_encrypted FROM parents").fetch_one(&t.core.pool).await.unwrap();
    assert!(!raw.windows(10).any(|w| w == b"9876543210"));
    assert_eq!(service::crypto::decrypt(&[7u8; 32], &raw).unwrap(), "+919876543210");

    let dump: String = sqlx::query_scalar("SELECT string_agg(metadata::text, ' ') FROM audit_logs").fetch_one(&t.core.pool).await.unwrap();
    assert!(!dump.contains("9876543210"), "phone must not reach the audit log");
}

#[sqlx::test(migrations = "./migrations")]
async fn parent_rules_validation_and_access(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let asha = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let ravi = t.create_student(&hod, "1AB22IS002", "Ravi P").await;
    let body = |sid, phone: &str| json!({"student_id": sid, "full_name": "P", "relationship": "father", "phone": phone, "sms_consent": true});

    assert_eq!(t.post("/api/v1/parents", &hod, body(asha.id, "12345")).await.0, StatusCode::UNPROCESSABLE_ENTITY);
    // A student may register their own parent, but not for a classmate, and cannot verify.
    let (s, b) = t.post("/api/v1/parents", &asha.token, body(asha.id, "9876543210")).await;
    assert_eq!(s, StatusCode::CREATED);
    assert_eq!(t.post("/api/v1/parents", &asha.token, body(ravi.id, "9876543210")).await.0, StatusCode::NOT_FOUND);
    assert_eq!(t.post(&format!("/api/v1/parents/{}/verify", b["id"].as_str().unwrap()), &asha.token, json!({})).await.0, StatusCode::FORBIDDEN);
    // Notification status is staff-only.
    assert_eq!(t.get("/api/v1/notifications", &asha.token).await.0, StatusCode::FORBIDDEN);
}
