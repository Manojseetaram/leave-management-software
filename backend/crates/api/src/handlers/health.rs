use crate::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde_json::{json, Value};

pub async fn live() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

pub async fn ready(State(core): State<AppState>) -> (StatusCode, Json<Value>) {
    match repository::ping(&core.pool).await {
        Ok(()) => (StatusCode::OK, Json(json!({ "status": "ready", "database": "ok" }))),
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, Json(json!({ "status": "unavailable", "database": "down" }))),
    }
}
