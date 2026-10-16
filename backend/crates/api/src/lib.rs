use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

async fn live() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

pub fn build_router() -> Router {
    Router::new().route("/api/v1/health/live", get(live))
}
