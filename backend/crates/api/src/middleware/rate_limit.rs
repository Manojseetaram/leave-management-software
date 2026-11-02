//! In-process sliding-window limits for credential endpoints.
//!
//! A reverse proxy or a shared rate-limit store is still required when the API
//! runs as more than one replica; this protects a single process and keeps the
//! login and recovery endpoints from being brute forced cheaply.

use axum::{
    extract::{ConnectInfo, Request, State},
    http::{header, HeaderValue, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::{
    collections::{HashMap, VecDeque},
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

#[derive(Clone)]
pub struct SlidingWindowLimiter {
    limit: u32,
    window: Duration,
    trust_proxy_headers: bool,
    requests: Arc<Mutex<HashMap<String, VecDeque<Instant>>>>,
}

impl SlidingWindowLimiter {
    pub fn new(limit_per_minute: u32, trust_proxy_headers: bool) -> Self {
        Self {
            limit: limit_per_minute.max(1),
            window: Duration::from_secs(60),
            trust_proxy_headers,
            requests: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn check(&self, key: &str) -> Result<(), u64> {
        let now = Instant::now();
        let mut requests = self.requests.lock().unwrap_or_else(|e| e.into_inner());
        let entry = requests.entry(key.to_string()).or_default();

        while entry
            .front()
            .is_some_and(|at| now.duration_since(*at) >= self.window)
        {
            entry.pop_front();
        }

        if entry.len() >= self.limit as usize {
            let oldest = entry.front().copied().unwrap_or(now);
            let retry_after = self.window.saturating_sub(now.duration_since(oldest));
            return Err(retry_after.as_secs().max(1));
        }

        entry.push_back(now);

        // Keep an idle deployment from retaining one entry per historical IP.
        if requests.len() > 10_000 {
            requests.retain(|_, queue| {
                while queue
                    .front()
                    .is_some_and(|at| now.duration_since(*at) >= self.window)
                {
                    queue.pop_front();
                }
                !queue.is_empty()
            });
        }
        Ok(())
    }

    fn key(&self, req: &Request) -> String {
        if self.trust_proxy_headers {
            if let Some(forwarded) = req
                .headers()
                .get("x-forwarded-for")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.split(',').next())
                .map(str::trim)
                .filter(|v| !v.is_empty())
            {
                return forwarded.to_string();
            }
        }

        req.extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .map(|ConnectInfo(addr)| addr.ip().to_string())
            .unwrap_or_else(|| "unknown".to_string())
    }
}

/// Axum middleware. Build one limiter per sensitive route group.
pub async fn enforce(
    State(limiter): State<SlidingWindowLimiter>,
    req: Request,
    next: Next,
) -> Response {
    let key = limiter.key(&req);
    if let Err(retry_after) = limiter.check(&key) {
        let mut response = (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "error": {
                    "code": "rate_limited",
                    "message": "too many attempts; try again later"
                }
            })),
        )
            .into_response();
        if let Ok(value) = HeaderValue::from_str(&retry_after.to_string()) {
            response.headers_mut().insert(header::RETRY_AFTER, value);
        }
        return response;
    }

    next.run(req).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_after_the_limit_and_separates_keys() {
        let limiter = SlidingWindowLimiter::new(2, false);
        assert!(limiter.check("a").is_ok());
        assert!(limiter.check("a").is_ok());
        assert!(limiter.check("a").is_err());
        assert!(limiter.check("b").is_ok());
    }

    #[test]
    fn old_requests_leave_the_window() {
        let mut limiter = SlidingWindowLimiter::new(1, false);
        limiter.window = Duration::from_millis(10);
        assert!(limiter.check("a").is_ok());
        std::thread::sleep(Duration::from_millis(20));
        assert!(limiter.check("a").is_ok());
    }
}
