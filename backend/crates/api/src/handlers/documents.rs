use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    body::Body,
    extract::{Multipart, Path, Query, State},
    http::{header, HeaderValue, StatusCode},
    response::Response,
    Json,
};
use domain::{
    error::DomainError,
    models::{DocumentRecord, DocumentVerification, PageParams, Paged},
};
use serde::Deserialize;
use serde_json::{json, Value};
use service::documents::UploadInput;
use uuid::Uuid;

struct UploadParts {
    document_type: Option<String>,
    original_filename: String,
    declared_content_type: Option<String>,
    data: Vec<u8>,
}

async fn read_multipart(mut multipart: Multipart) -> Result<UploadParts, DomainError> {
    let mut document_type = None;
    let mut file: Option<(String, Option<String>, Vec<u8>)> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| DomainError::Validation(format!("invalid multipart upload: {e}")))?
    {
        match field.name().unwrap_or_default() {
            "document_type" => {
                let value = field
                    .text()
                    .await
                    .map_err(|e| DomainError::Validation(format!("invalid document_type: {e}")))?;
                document_type = Some(value);
            }
            "file" => {
                if file.is_some() {
                    return Err(DomainError::Validation(
                        "only one file may be uploaded per request".into(),
                    ));
                }
                let filename = field.file_name().unwrap_or("document").to_string();
                let content_type = field.content_type().map(str::to_string);
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| DomainError::Validation(format!("invalid upload body: {e}")))?;
                file = Some((filename, content_type, bytes.to_vec()));
            }
            _ => {
                // Unknown fields are ignored; their bytes are drained by the
                // next call to next_field and remain bounded by the body limit.
            }
        }
    }

    let (original_filename, declared_content_type, data) =
        file.ok_or_else(|| DomainError::Validation("file is required".into()))?;
    Ok(UploadParts {
        document_type,
        original_filename,
        declared_content_type,
        data,
    })
}

pub async fn upload_for_leave(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
    multipart: Multipart,
) -> ApiResult<(StatusCode, Json<DocumentRecord>)> {
    let parts = read_multipart(multipart).await?;
    let document = service::documents::upload(
        &core,
        &p,
        UploadInput {
            leave_request_id: Some(id),
            event_id: None,
            document_type: parts.document_type.unwrap_or_else(|| "other".to_string()),
            original_filename: parts.original_filename,
            declared_content_type: parts.declared_content_type,
            data: parts.data,
        },
    )
    .await?;
    Ok((StatusCode::CREATED, Json(document)))
}

pub async fn upload_for_event(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
    multipart: Multipart,
) -> ApiResult<(StatusCode, Json<DocumentRecord>)> {
    let parts = read_multipart(multipart).await?;
    let document = service::documents::upload(
        &core,
        &p,
        UploadInput {
            leave_request_id: None,
            event_id: Some(id),
            document_type: parts
                .document_type
                .unwrap_or_else(|| "participation_certificate".to_string()),
            original_filename: parts.original_filename,
            declared_content_type: parts.declared_content_type,
            data: parts.data,
        },
    )
    .await?;
    Ok((StatusCode::CREATED, Json(document)))
}

pub async fn list_for_leave(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<Value>> {
    Ok(Json(json!({
        "items": service::documents::list_for_request(&core, &p, id).await?
    })))
}

pub async fn list_evidence(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<Value>> {
    Ok(Json(json!({
        "items": service::documents::list_for_event(&core, &p, id).await?
    })))
}

fn safe_disposition(filename: &str) -> HeaderValue {
    let cleaned: String = filename
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, ' ' | '.' | '-' | '_' | '(' | ')') {
                c
            } else {
                '_'
            }
        })
        .take(180)
        .collect();
    let value = format!("attachment; filename=\"{cleaned}\"");
    HeaderValue::from_str(&value)
        .unwrap_or_else(|_| HeaderValue::from_static("attachment; filename=\"document\""))
}

pub async fn download(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Response> {
    let document = service::documents::download(&core, &p, id).await?;
    let len = document.bytes.len();
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, document.content_type)
        .header(header::CONTENT_LENGTH, len)
        .header(
            header::CONTENT_DISPOSITION,
            safe_disposition(&document.original_filename),
        )
        .header(header::CACHE_CONTROL, "private, no-store")
        .header(header::X_CONTENT_TYPE_OPTIONS, "nosniff")
        .body(Body::from(document.bytes))
        .map_err(|e| DomainError::Internal(format!("build download response: {e}")).into())
}

#[derive(Deserialize)]
pub struct ReviewQuery {
    pub verification_status: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn list_review(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<ReviewQuery>,
) -> ApiResult<Json<Paged<DocumentRecord>>> {
    let page = PageParams {
        page: q.page,
        per_page: q.per_page,
    };
    Ok(Json(
        service::documents::list_for_review(&core, &p, q.verification_status.as_deref(), page)
            .await?,
    ))
}

pub async fn verify(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<DocumentVerification>,
) -> ApiResult<Json<DocumentRecord>> {
    Ok(Json(service::documents::verify(&core, &p, id, body).await?))
}
