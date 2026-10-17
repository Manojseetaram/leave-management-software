//! HTTP layer: routing, extraction, JSON shaping, error mapping. No business rules.
pub mod error;
pub mod extractors;
pub mod handlers;
pub mod middleware;
pub mod router;

/// Axum state is simply the shared service context.
pub type AppState = service::context::Core;
