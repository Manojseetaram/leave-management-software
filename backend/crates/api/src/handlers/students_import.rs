use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{extract::State, Json};
use domain::models::NewStudent;
use serde::Deserialize;
use service::students::BulkImportResult;

/// Accepts either `{ "students": [...], "dry_run": true }` or a bare JSON array
/// for backwards compatibility with the original importer.
#[derive(Deserialize)]
#[serde(untagged)]
pub enum ImportPayload {
    Wrapped {
        students: Vec<NewStudent>,
        #[serde(default)]
        dry_run: bool,
    },
    List(Vec<NewStudent>),
}

impl ImportPayload {
    fn parts(self) -> (Vec<NewStudent>, bool) {
        match self {
            ImportPayload::Wrapped { students, dry_run } => (students, dry_run),
            ImportPayload::List(students) => (students, false),
        }
    }
}

pub async fn import(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Json(payload): Json<ImportPayload>,
) -> ApiResult<Json<BulkImportResult>> {
    let (students, dry_run) = payload.parts();
    Ok(Json(
        service::students::bulk_import(&core, &p, students, dry_run).await?,
    ))
}
