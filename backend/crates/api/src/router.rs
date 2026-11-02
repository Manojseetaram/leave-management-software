use crate::{
    handlers::*,
    middleware::rate_limit::{self, SlidingWindowLimiter},
    AppState,
};
use axum::{
    extract::DefaultBodyLimit,
    http::{header, HeaderName, HeaderValue, Method},
    middleware,
    routing::{delete, get, patch, post},
    Router,
};
use tower_http::{
    cors::{AllowOrigin, CorsLayer as TowerCorsLayer},
    limit::RequestBodyLimitLayer,
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};

fn security_header(name: HeaderName, value: &'static str) -> SetResponseHeaderLayer<HeaderValue> {
    SetResponseHeaderLayer::overriding(name, HeaderValue::from_static(value))
}

pub fn build_router(state: AppState) -> Router {
    let login_limiter = SlidingWindowLimiter::new(
        state.settings.login_rate_limit_per_minute,
        state.settings.trust_proxy_headers,
    );
    let recovery_limiter = SlidingWindowLimiter::new(
        state.settings.password_reset_rate_limit_per_minute,
        state.settings.trust_proxy_headers,
    );

    let v1 = Router::new()
        // health
        .route("/health/live", get(health::live))
        .route("/health/ready", get(health::ready))
        // auth
        .route(
            "/auth/login",
            post(auth::login).layer(middleware::from_fn_with_state(
                login_limiter.clone(),
                rate_limit::enforce,
            )),
        )
        .route("/auth/logout", post(auth::logout))
        .route("/auth/me", get(auth::me))
        .route("/auth/change-password", post(auth::change_password))
        .route(
            "/auth/forgot-password",
            post(auth::forgot_password).layer(middleware::from_fn_with_state(
                recovery_limiter.clone(),
                rate_limit::enforce,
            )),
        )
        .route(
            "/auth/reset-password",
            post(auth::reset_password).layer(middleware::from_fn_with_state(
                recovery_limiter.clone(),
                rate_limit::enforce,
            )),
        )
        .route("/auth/sessions", get(auth::sessions))
        .route("/auth/sessions/:id", delete(auth::revoke_session))
        // staff accounts
        .route("/users", post(users::create))
        // students
        .route("/students", post(students::create).get(students::list))
        .route("/students/import", post(students_import::import))
        .route(
            "/students/:id",
            get(students::show)
                .patch(students::update)
                .delete(students::deactivate),
        )
        .route("/students/:id/restore", post(students::restore))
        .route(
            "/students/:id/reset-password",
            post(students::reset_password),
        )
        .route("/students/:id/history", get(students::history))
        .route("/students/:id/parents", get(parents::list_for_student))
        // faculty: limited, explicitly permissioned views
        .route("/faculty/students", get(faculty::students))
        .route("/faculty/leave-requests", get(faculty::leave_requests))
        // parents
        .route("/parents", post(parents::create))
        .route("/parents/:id", patch(parents::update))
        .route("/parents/:id/verify", post(parents::verify))
        // leave requests
        .route("/leave-requests", post(leave::create).get(leave::list))
        .route("/leave-requests/:id", get(leave::show).patch(leave::update))
        .route("/leave-requests/:id/submit", post(leave::submit))
        .route("/leave-requests/:id/withdraw", post(leave::withdraw))
        .route("/leave-requests/:id/approve", post(leave::approve))
        .route("/leave-requests/:id/reject", post(leave::reject))
        .route(
            "/leave-requests/:id/request-changes",
            post(leave::request_changes),
        )
        .route("/leave-requests/:id/return", post(leave::record_return))
        .route("/leave-requests/:id/completion", post(leave::complete))
        .route("/leave-requests/:id/history", get(leave::history))
        .route(
            "/leave-requests/:id/documents",
            post(documents::upload_for_leave).get(documents::list_for_leave),
        )
        // events and evidence
        .route("/events", post(events::create).get(events::list))
        .route("/events/:id", get(events::show).patch(events::update))
        .route(
            "/events/:id/evidence",
            post(documents::upload_for_event).get(documents::list_evidence),
        )
        .route("/documents/:id/download", get(documents::download))
        .route("/documents/:id/verification", patch(documents::verify))
        // notifications + admin
        .route("/notifications", get(notifications::list))
        .route("/notifications/:id", get(notifications::show))
        .route(
            "/webhooks/sms/:provider",
            post(notifications::delivery_callback),
        )
        .route("/admin/dashboard", get(admin::dashboard))
        .route("/admin/documents", get(documents::list_review))
        .route("/admin/audit-logs", get(admin::audit_logs))
        .route("/admin/reports/leaves", get(admin::leave_report));

    let body_limit = state.settings.max_upload_bytes.saturating_add(1024 * 1024);
    let origins = state
        .settings
        .cors_allowed_origins
        .iter()
        .filter_map(|origin| origin.parse::<HeaderValue>().ok())
        .collect::<Vec<_>>();
    let mut cors = TowerCorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, header::ACCEPT]);
    if !origins.is_empty() {
        cors = cors.allow_origin(AllowOrigin::list(origins));
    }

    Router::new()
        .nest("/api/v1", v1)
        .layer(cors)
        .layer(DefaultBodyLimit::max(body_limit))
        .layer(RequestBodyLimitLayer::new(body_limit))
        .layer(security_header(header::X_CONTENT_TYPE_OPTIONS, "nosniff"))
        .layer(security_header(header::X_FRAME_OPTIONS, "DENY"))
        .layer(security_header(header::REFERRER_POLICY, "no-referrer"))
        .layer(security_header(
            HeaderName::from_static("permissions-policy"),
            "camera=(), microphone=(), geolocation=()",
        ))
        .layer(security_header(
            HeaderName::from_static("content-security-policy"),
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        ))
        .layer(security_header(
            HeaderName::from_static("strict-transport-security"),
            "max-age=31536000; includeSubDomains",
        ))
        .layer(security_header(header::CACHE_CONTROL, "no-store"))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
