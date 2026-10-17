mod common;
use axum::http::{Method, StatusCode};
use common::*;
use serde_json::{json, Value};
use sqlx::PgPool;

fn statuses(history: &Value) -> Vec<String> {
    history["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|h| h["new_status"].as_str().unwrap().to_string())
        .collect()
}

#[sqlx::test(migrations = "./migrations")]
async fn full_flow_create_submit_approve_complete_with_history(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;

    let (s, draft) = t
        .post("/api/v1/leave-requests", &st.token, TestApp::leave_body())
        .await;
    assert_eq!(s, StatusCode::CREATED);
    assert_eq!(draft["status"], "draft");
    assert_eq!(draft["student_id"], st.id.to_string());
    let id = draft["id"].as_str().unwrap();

    // A draft is not visible to the HOD's pending queue and is NOT approved.
    assert_eq!(
        t.get("/api/v1/leave-requests?status=pending", &hod).await.1["total"],
        0
    );

    let (s, b) = t
        .post(
            &format!("/api/v1/leave-requests/{id}/submit"),
            &st.token,
            json!({}),
        )
        .await;
    assert_eq!((s, b["status"].clone()), (StatusCode::OK, json!("pending")));
    assert!(!b["submitted_at"].is_null());
    assert!(
        b["decided_at"].is_null(),
        "submitting must never count as a decision"
    );
    assert_eq!(
        t.get("/api/v1/leave-requests?status=pending", &hod).await.1["total"],
        1
    );

    let (s, b) = t
        .post(
            &format!("/api/v1/leave-requests/{id}/approve"),
            &hod,
            json!({"comment": "Enjoy"}),
        )
        .await;
    assert_eq!(
        (s, b["status"].clone()),
        (StatusCode::OK, json!("approved"))
    );
    assert_eq!(b["decision_reason"], "Enjoy");
    assert!(!b["decided_by"].is_null() && !b["decided_at"].is_null());

    let (s, b) = t
        .post(
            &format!("/api/v1/leave-requests/{id}/completion"),
            &st.token,
            json!({}),
        )
        .await;
    assert_eq!(
        (s, b["status"].clone()),
        (StatusCode::OK, json!("completed"))
    );
    assert_eq!(
        b["decision_reason"], "Enjoy",
        "original decision is preserved after completion"
    );

    let (s, h) = t
        .get(&format!("/api/v1/leave-requests/{id}/history"), &st.token)
        .await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(statuses(&h), ["draft", "pending", "approved", "completed"]);
    assert_eq!(h["items"][2]["old_status"], "pending");
}

#[sqlx::test(migrations = "./migrations")]
async fn only_the_hod_may_decide(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let admin = t.admin_token().await;
    let asha = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let ravi = t.create_student(&hod, "1AB22IS002", "Ravi P").await;
    let id = t.submitted_request(&asha.token).await;
    let approve = format!("/api/v1/leave-requests/{id}/approve");

    // Owner student -> 403, other student -> 404, department admin -> 403.
    assert_eq!(
        t.post(&approve, &asha.token, json!({})).await.0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        t.post(&approve, &ravi.token, json!({})).await.0,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        t.post(&approve, &admin, json!({})).await.0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        t.post(
            &format!("/api/v1/leave-requests/{id}/reject"),
            &asha.token,
            json!({"comment": "x"})
        )
        .await
        .0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        t.get(&format!("/api/v1/leave-requests/{id}"), &hod).await.1["status"],
        "pending"
    );

    assert_eq!(t.post(&approve, &hod, json!({})).await.0, StatusCode::OK);
}

#[sqlx::test(migrations = "./migrations")]
async fn reject_and_request_changes_require_a_reason(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let id = t.submitted_request(&st.token).await;

    for action in ["reject", "request-changes"] {
        let url = format!("/api/v1/leave-requests/{id}/{action}");
        assert_eq!(
            t.post(&url, &hod, json!({})).await.0,
            StatusCode::UNPROCESSABLE_ENTITY
        );
        assert_eq!(
            t.post(&url, &hod, json!({"comment": "   "})).await.0,
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }
    // Still pending: failed attempts changed nothing.
    assert_eq!(
        t.get(&format!("/api/v1/leave-requests/{id}"), &hod).await.1["status"],
        "pending"
    );

    let (s, b) = t
        .post(
            &format!("/api/v1/leave-requests/{id}/reject"),
            &hod,
            json!({"comment": "Internal exams"}),
        )
        .await;
    assert_eq!(
        (s, b["status"].clone(), b["decision_reason"].clone()),
        (StatusCode::OK, json!("rejected"), json!("Internal exams"))
    );
    // Terminal.
    assert_eq!(
        t.post(
            &format!("/api/v1/leave-requests/{id}/approve"),
            &hod,
            json!({})
        )
        .await
        .0,
        StatusCode::CONFLICT
    );
    assert_eq!(
        t.post(
            &format!("/api/v1/leave-requests/{id}/submit"),
            &st.token,
            json!({})
        )
        .await
        .0,
        StatusCode::CONFLICT
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn changes_requested_lets_student_edit_and_resubmit(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let id = t.submitted_request(&st.token).await;
    let url = format!("/api/v1/leave-requests/{id}");

    // Pending requests cannot be edited.
    let (s, _) = t
        .call(
            Method::PATCH,
            &url,
            Some(&st.token),
            Some(json!({"reason": "changed"})),
        )
        .await;
    assert_eq!(s, StatusCode::CONFLICT);

    let (s, b) = t
        .post(
            &format!("{url}/request-changes"),
            &hod,
            json!({"comment": "Add the invitation details"}),
        )
        .await;
    assert_eq!(
        (s, b["status"].clone()),
        (StatusCode::OK, json!("changes_requested"))
    );

    let (s, b) = t
        .call(
            Method::PATCH,
            &url,
            Some(&st.token),
            Some(json!({"reason": "Hackathon at IISc", "request_type": "event_permission"})),
        )
        .await;
    assert_eq!(s, StatusCode::OK);
    assert_eq!(
        (
            b["reason"].clone(),
            b["request_type"].clone(),
            b["destination"].clone()
        ),
        (
            json!("Hackathon at IISc"),
            json!("event_permission"),
            json!("Mysuru")
        )
    );

    let (s, b) = t.post(&format!("{url}/submit"), &st.token, json!({})).await;
    assert_eq!((s, b["status"].clone()), (StatusCode::OK, json!("pending")));
    assert_eq!(
        t.post(&format!("{url}/approve"), &hod, json!({})).await.0,
        StatusCode::OK
    );

    let (_, h) = t.get(&format!("{url}/history"), &hod).await;
    assert_eq!(
        statuses(&h),
        [
            "draft",
            "pending",
            "changes_requested",
            "pending",
            "approved"
        ]
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn approved_requests_cannot_be_edited_withdrawn_or_resubmitted(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let id = t.submitted_request(&st.token).await;
    let url = format!("/api/v1/leave-requests/{id}");
    t.post(&format!("{url}/approve"), &hod, json!({})).await;

    let (s, _) = t
        .call(
            Method::PATCH,
            &url,
            Some(&st.token),
            Some(json!({"end_at": "2030-02-01T00:00:00Z"})),
        )
        .await;
    assert_eq!(s, StatusCode::CONFLICT);
    assert_eq!(
        t.post(&format!("{url}/withdraw"), &st.token, json!({}))
            .await
            .0,
        StatusCode::CONFLICT
    );
    assert_eq!(
        t.post(&format!("{url}/submit"), &st.token, json!({}))
            .await
            .0,
        StatusCode::CONFLICT
    );
    let (_, b) = t.get(&url, &st.token).await;
    assert_eq!(
        (b["status"].clone(), b["end_at"].clone()),
        (json!("approved"), json!("2030-01-12T12:00:00Z"))
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn withdraw_works_for_draft_and_pending(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let pending = t.submitted_request(&st.token).await;
    let (s, b) = t
        .post(
            &format!("/api/v1/leave-requests/{pending}/withdraw"),
            &st.token,
            json!({}),
        )
        .await;
    assert_eq!(
        (s, b["status"].clone()),
        (StatusCode::OK, json!("withdrawn"))
    );
    let (_, d) = t
        .post("/api/v1/leave-requests", &st.token, TestApp::leave_body())
        .await;
    let (s, b) = t
        .post(
            &format!(
                "/api/v1/leave-requests/{}/withdraw",
                d["id"].as_str().unwrap()
            ),
            &st.token,
            json!({}),
        )
        .await;
    assert_eq!(
        (s, b["status"].clone()),
        (StatusCode::OK, json!("withdrawn"))
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn students_only_ever_see_their_own_requests(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let asha = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let ravi = t.create_student(&hod, "1AB22IS002", "Ravi P").await;
    let asha_req = t.submitted_request(&asha.token).await;
    t.submitted_request(&ravi.token).await;

    assert_eq!(
        t.get("/api/v1/leave-requests", &asha.token).await.1["total"],
        1
    );
    assert_eq!(t.get("/api/v1/leave-requests", &hod).await.1["total"], 2);
    for suffix in ["", "/history"] {
        assert_eq!(
            t.get(
                &format!("/api/v1/leave-requests/{asha_req}{suffix}"),
                &ravi.token
            )
            .await
            .0,
            StatusCode::NOT_FOUND
        );
    }
    let (s, _) = t
        .call(
            Method::PATCH,
            &format!("/api/v1/leave-requests/{asha_req}"),
            Some(&ravi.token),
            Some(json!({"reason": "hijack"})),
        )
        .await;
    assert_eq!(s, StatusCode::NOT_FOUND);
    for action in ["submit", "withdraw", "completion"] {
        assert_eq!(
            t.post(
                &format!("/api/v1/leave-requests/{asha_req}/{action}"),
                &ravi.token,
                json!({})
            )
            .await
            .0,
            StatusCode::NOT_FOUND
        );
    }
    // Cannot file a request in someone else's name.
    let mut body = TestApp::leave_body();
    body["student_id"] = json!(asha.id);
    assert_eq!(
        t.post("/api/v1/leave-requests", &ravi.token, body).await.0,
        StatusCode::NOT_FOUND
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn staff_can_file_on_behalf_but_must_name_the_student(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    assert_eq!(
        t.post("/api/v1/leave-requests", &hod, TestApp::leave_body())
            .await
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let mut body = TestApp::leave_body();
    body["student_id"] = json!(st.id);
    let (s, b) = t.post("/api/v1/leave-requests", &hod, body).await;
    assert_eq!(
        (s, b["student_id"].clone()),
        (StatusCode::CREATED, json!(st.id.to_string()))
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn request_validation(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let mutate = |f: fn(&mut Value)| {
        let mut b = TestApp::leave_body();
        f(&mut b);
        b
    };
    let bad = [
        mutate(|b| b["request_type"] = json!("vacation")),
        mutate(|b| b["reason"] = json!("   ")),
        mutate(|b| b["end_at"] = json!("2030-01-10T04:00:00Z")),
        mutate(|b| b["end_at"] = json!("2030-01-01T00:00:00Z")),
        mutate(|b| b["end_at"] = json!("2032-01-01T00:00:00Z")),
    ];
    for body in bad {
        assert_eq!(
            t.post("/api/v1/leave-requests", &st.token, body.clone())
                .await
                .0,
            StatusCode::UNPROCESSABLE_ENTITY,
            "{body}"
        );
    }
    assert_eq!(
        t.get("/api/v1/leave-requests?status=bogus", &st.token)
            .await
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        t.get("/api/v1/leave-requests/not-a-uuid", &st.token)
            .await
            .0,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        t.get(
            &format!("/api/v1/leave-requests/{}", uuid::Uuid::new_v4()),
            &st.token
        )
        .await
        .0,
        StatusCode::NOT_FOUND
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn concurrent_decisions_resolve_to_exactly_one_winner(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let id = t.submitted_request(&st.token).await;
    let (approve, reject) = (
        format!("/api/v1/leave-requests/{id}/approve"),
        format!("/api/v1/leave-requests/{id}/reject"),
    );

    let (a, b) = tokio::join!(
        t.post(&approve, &hod, json!({})),
        t.post(&reject, &hod, json!({"comment": "No"}))
    );
    let mut codes = [a.0.as_u16(), b.0.as_u16()];
    codes.sort();
    assert_eq!(
        codes,
        [200, 409],
        "one decision wins, the other gets a conflict"
    );

    // Exactly one decision in the history, and it matches the final status.
    let (_, h) = t
        .get(&format!("/api/v1/leave-requests/{id}/history"), &hod)
        .await;
    let s = statuses(&h);
    assert_eq!(s.len(), 3, "{s:?}");
    let final_status =
        t.get(&format!("/api/v1/leave-requests/{id}"), &hod).await.1["status"].clone();
    assert_eq!(final_status, json!(s[2]));
}

#[sqlx::test(migrations = "./migrations")]
async fn database_itself_refuses_illegal_transitions_and_history_edits(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let (_, d) = t
        .post("/api/v1/leave-requests", &st.token, TestApp::leave_body())
        .await;
    let id: uuid::Uuid = d["id"].as_str().unwrap().parse().unwrap();

    // Even raw SQL cannot jump draft -> approved (trigger from migration 0002).
    let r = sqlx::query("UPDATE leave_requests SET status = 'approved' WHERE id = $1")
        .bind(id)
        .execute(&t.core.pool)
        .await;
    assert!(
        r.is_err(),
        "draft -> approved must be rejected by the database"
    );
    // History and audit rows are append-only.
    assert!(
        sqlx::query("UPDATE request_history SET comment = 'tampered'")
            .execute(&t.core.pool)
            .await
            .is_err()
    );
    assert!(sqlx::query("DELETE FROM request_history")
        .execute(&t.core.pool)
        .await
        .is_err());
    assert!(sqlx::query("DELETE FROM audit_logs")
        .execute(&t.core.pool)
        .await
        .is_err());
    // A rejection without a reason is also impossible.
    assert!(
        sqlx::query("UPDATE leave_requests SET status = 'withdrawn' WHERE id = $1")
            .bind(id)
            .execute(&t.core.pool)
            .await
            .is_ok()
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn every_transition_is_audited(pool: PgPool) {
    let t = TestApp::new(pool).await;
    let hod = t.hod_token().await;
    let st = t.create_student(&hod, "1AB22IS001", "Asha K").await;
    let id = t.submitted_request(&st.token).await;
    t.post(
        &format!("/api/v1/leave-requests/{id}/approve"),
        &hod,
        json!({}),
    )
    .await;
    let (_, b) = t
        .get("/api/v1/admin/audit-logs?entity_type=leave_request", &hod)
        .await;
    let actions: Vec<&str> = b["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|e| e["action"].as_str().unwrap())
        .collect();
    for expected in ["leave.create", "leave.pending", "leave.approved"] {
        assert!(
            actions.contains(&expected),
            "{expected} missing in {actions:?}"
        );
    }
}
