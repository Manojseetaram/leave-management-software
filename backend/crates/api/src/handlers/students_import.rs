use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{extract::State, Json};
use domain::models::NewStudent;
use serde::Serialize;

#[derive(Serialize)]
pub struct ImportResult {
    pub created: usize,
    pub failed: usize,
}

pub async fn import(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Json(students): Json<Vec<NewStudent>>,
) -> ApiResult<Json<ImportResult>> {
    let mut created = 0;
    let mut failed = 0;

    for s in students {
        match service::students::create(&core, &p, s).await {
            Ok(_) => created += 1,
            Err(_) => failed += 1,
        }
    }

    Ok(Json(ImportResult { created, failed }))
}
