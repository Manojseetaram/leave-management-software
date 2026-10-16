use crate::{handlers::*, AppState};
use axum::{
    http::{header, HeaderValue},
    routing::{delete, get, post},
    Router,
};
use tower_http::{limit::RequestBodyLimitLayer, set_header::SetResponseHeaderLayer, trace::TraceLayer};

pub fn build_router(state: AppState) -> Router {
    let v1 = Router::new()
        // health
        .route("/health/live", get(health::live))
        .route("/health/ready", get(health::ready))
        // auth
        .route("/auth/login", post(auth::login))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/me", get(auth::me))
        .route("/auth/change-password", post(auth::change_password))
        .route("/auth/sessions", get(auth::sessions))
        .route("/auth/sessions/:id", delete(auth::revoke_session))
        // staff accounts
        .route("/users", post(users::create))
        // students
        .route("/students", post(students::create).get(students::list))
        .route(
            "/students/:id",
            get(students::show).patch(students::update).delete(students::deactivate),
        )
        .route("/students/:id/restore", post(students::restore))
        .route("/students/:id/reset-password", post(students::reset_password))
        .route("/students/:id/history", get(students::history))
        .route("/students/:id/parents", get(parents::list_for_student))
        // parents
        .route("/parents", post(parents::create))
        .route("/parents/:id/verify", post(parents::verify))
        // leave requests
        .route("/leave-requests", post(leave::create).get(leave::list))
        .route("/leave-requests/:id", get(leave::show).patch(leave::update))
        .route("/leave-requests/:id/submit", post(leave::submit))
        .route("/leave-requests/:id/withdraw", post(leave::withdraw))
        .route("/leave-requests/:id/approve", post(leave::approve))
        .route("/leave-requests/:id/reject", post(leave::reject))
        .route("/leave-requests/:id/request-changes", post(leave::request_changes))
        .route("/leave-requests/:id/completion", post(leave::complete))
        .route("/leave-requests/:id/history", get(leave::history))
        // notifications + admin
        .route("/notifications", get(notifications::list))
        .route("/admin/audit-logs", get(admin::audit_logs));

    Router::new()
        .nest("/api/v1", v1)
        .layer(RequestBodyLimitLayer::new(1024 * 1024))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
