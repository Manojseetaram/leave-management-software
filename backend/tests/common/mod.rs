#![allow(dead_code)]
use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
    Router,
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use service::{
    context::{Core, Settings},
    notifications::MockSmsProvider,
};
use sqlx::PgPool;
use std::sync::Arc;
use tower::ServiceExt;
use uuid::Uuid;

pub const ADMIN_EMAIL: &str = "admin@college.edu";
pub const ADMIN_PASSWORD: &str = "Bootstrap-Pass-1";
pub const NEW_PASSWORD: &str = "Correct-Horse-9";

pub struct TestApp {
    pub app: Router,
    pub core: Core,
    pub sms: Arc<MockSmsProvider>,
}

pub struct StudentLogin {
    pub id: Uuid,
    pub token: String,
}

impl TestApp {
    pub async fn new(pool: PgPool) -> Self {
        let sms = Arc::new(MockSmsProvider::default());
        let settings = Settings {
            phone_key: [7u8; 32],
            session_ttl_hours: 1,
            sms_max_attempts: 3,
        };
        let core = Core::new(pool, settings, sms.clone());
        assert!(
            service::users::bootstrap_admin(&core, ADMIN_EMAIL, ADMIN_PASSWORD, "Dept Admin")
                .await
                .unwrap()
        );
        let app = api::router::build_router(core.clone());
        Self { app, core, sms }
    }

    pub async fn call(
        &self,
        method: Method,
        uri: &str,
        token: Option<&str>,
        body: Option<Value>,
    ) -> (StatusCode, Value) {
        let mut b = Request::builder().method(method).uri(uri);
        if let Some(t) = token {
            b = b.header("authorization", format!("Bearer {t}"));
        }
        let req = match body {
            Some(v) => b
                .header("content-type", "application/json")
                .body(Body::from(v.to_string())),
            None => b.body(Body::empty()),
        }
        .unwrap();
        let resp = self.app.clone().oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = resp.into_body().collect().await.unwrap().to_bytes();
        let json = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        (status, json)
    }

    pub async fn get(&self, uri: &str, token: &str) -> (StatusCode, Value) {
        self.call(Method::GET, uri, Some(token), None).await
    }

    pub async fn post(&self, uri: &str, token: &str, body: Value) -> (StatusCode, Value) {
        self.call(Method::POST, uri, Some(token), Some(body)).await
    }

    /// Logs in with the temporary password, changes it, and returns a usable token.
    pub async fn onboard(&self, login: &str, temp_password: &str) -> String {
        let (s, b) = self
            .call(
                Method::POST,
                "/api/v1/auth/login",
                None,
                Some(json!({"login": login, "password": temp_password})),
            )
            .await;
        assert_eq!(s, StatusCode::OK, "login failed: {b}");
        let token = b["token"].as_str().unwrap().to_string();
        let (s, b) = self
            .post(
                "/api/v1/auth/change-password",
                &token,
                json!({"current_password": temp_password, "new_password": NEW_PASSWORD}),
            )
            .await;
        assert_eq!(s, StatusCode::NO_CONTENT, "change-password failed: {b}");
        token
    }

    /// First call changes the bootstrap password; later calls just log in again.
    pub async fn admin_token(&self) -> String {
        let (s, _) = self
            .call(
                Method::POST,
                "/api/v1/auth/login",
                None,
                Some(json!({"login": ADMIN_EMAIL, "password": ADMIN_PASSWORD})),
            )
            .await;
        if s == StatusCode::OK {
            return self.onboard(ADMIN_EMAIL, ADMIN_PASSWORD).await;
        }
        let (s, b) = self
            .call(
                Method::POST,
                "/api/v1/auth/login",
                None,
                Some(json!({"login": ADMIN_EMAIL, "password": NEW_PASSWORD})),
            )
            .await;
        assert_eq!(s, StatusCode::OK, "{b}");
        b["token"].as_str().unwrap().to_string()
    }

    pub async fn hod_token(&self) -> String {
        let admin = self.admin_token().await;
        let (s, b) = self
            .post(
                "/api/v1/users",
                &admin,
                json!({"email": "hod@college.edu", "full_name": "Dr. HOD", "roles": ["hod"]}),
            )
            .await;
        assert_eq!(s, StatusCode::CREATED, "{b}");
        self.onboard("hod@college.edu", b["temporary_password"].as_str().unwrap())
            .await
    }

    pub async fn create_student(
        &self,
        staff_token: &str,
        register_number: &str,
        name: &str,
    ) -> StudentLogin {
        let (s, b) = self
            .post(
                "/api/v1/students",
                staff_token,
                json!({"register_number": register_number, "full_name": name, "semester": 5, "section": "A", "admission_year": 2022}),
            )
            .await;
        assert_eq!(s, StatusCode::CREATED, "{b}");
        let id: Uuid = b["student"]["id"].as_str().unwrap().parse().unwrap();
        let token = self
            .onboard(register_number, b["temporary_password"].as_str().unwrap())
            .await;
        StudentLogin { id, token }
    }

    /// Adds a consenting, verified parent so SMS notifications are eligible.
    pub async fn add_verified_parent(
        &self,
        staff_token: &str,
        student_id: Uuid,
        phone: &str,
    ) -> Uuid {
        let (s, b) = self
            .post(
                "/api/v1/parents",
                staff_token,
                json!({"student_id": student_id, "full_name": "Mr. Parent", "relationship": "father", "phone": phone, "sms_consent": true}),
            )
            .await;
        assert_eq!(s, StatusCode::CREATED, "{b}");
        let pid = b["id"].as_str().unwrap().to_string();
        let (s, b) = self
            .post(
                &format!("/api/v1/parents/{pid}/verify"),
                staff_token,
                json!({}),
            )
            .await;
        assert_eq!(s, StatusCode::OK, "{b}");
        pid.parse().unwrap()
    }

    pub fn leave_body() -> Value {
        json!({
            "request_type": "personal_leave",
            "reason": "Family function",
            "destination": "Mysuru",
            "start_at": "2030-01-10T04:00:00Z",
            "end_at": "2030-01-12T12:00:00Z"
        })
    }

    /// Student creates a draft and submits it; returns the request id.
    pub async fn submitted_request(&self, student_token: &str) -> String {
        let (s, b) = self
            .post("/api/v1/leave-requests", student_token, Self::leave_body())
            .await;
        assert_eq!(s, StatusCode::CREATED, "{b}");
        let id = b["id"].as_str().unwrap().to_string();
        let (s, b) = self
            .post(
                &format!("/api/v1/leave-requests/{id}/submit"),
                student_token,
                json!({}),
            )
            .await;
        assert_eq!(s, StatusCode::OK, "{b}");
        id
    }
}
