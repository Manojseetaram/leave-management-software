use axum::{extract::Request, middleware::Next, response::Response};

pub async fn require_permission(
    _permission: &'static str,
) -> impl Fn(Request, Next) -> futures::future::BoxFuture<'static, Response> {
    move |req, next| Box::pin(async move { next.run(req).await })
}
