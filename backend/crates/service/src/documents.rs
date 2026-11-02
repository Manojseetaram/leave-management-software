use crate::{
    context::Core,
    storage::{
        checksum_sha256, detect_content_type, sanitize_original_filename, storage_key,
        validate_document_type, ScanVerdict,
    },
    students::ensure_access,
};
use domain::{
    error::{DomainError, DomainResult},
    models::{DocumentRecord, DocumentVerification},
    principal::Principal,
};
use repository::{audit, db_err, documents, events, leave};
use serde_json::json;
use uuid::Uuid;

pub struct UploadInput {
    pub leave_request_id: Option<Uuid>,
    pub event_id: Option<Uuid>,
    pub document_type: String,
    pub original_filename: String,
    /// Declared by the client for diagnostics only; the detected type wins.
    pub declared_content_type: Option<String>,
    pub data: Vec<u8>,
}

pub struct DownloadedDocument {
    pub bytes: Vec<u8>,
    pub content_type: String,
    pub original_filename: String,
}

enum Target {
    Request(Uuid),
    Event(Uuid),
}

async fn resolve_target(
    core: &Core,
    actor: &Principal,
    input: &UploadInput,
) -> DomainResult<Target> {
    match (input.leave_request_id, input.event_id) {
        (Some(request_id), None) => {
            let request = leave::get(&core.pool, request_id)
                .await?
                .ok_or(DomainError::NotFound)?;
            ensure_access(actor, request.student_id)?;
            Ok(Target::Request(request_id))
        }
        (None, Some(event_id)) => {
            let event = events::get(&core.pool, event_id)
                .await?
                .ok_or(DomainError::NotFound)?;
            ensure_access(actor, event.student_id)?;
            Ok(Target::Event(event_id))
        }
        _ => Err(DomainError::Validation(
            "exactly one of leave_request_id or event_id is required".into(),
        )),
    }
}

/// Validates by content (magic bytes), scans, writes to private storage and
/// records metadata. A failed database write removes the just-written object.
pub async fn upload(
    core: &Core,
    actor: &Principal,
    input: UploadInput,
) -> DomainResult<DocumentRecord> {
    let target = resolve_target(core, actor, &input).await?;
    let document_type =
        validate_document_type(&input.document_type).map_err(DomainError::Validation)?;
    let original_filename = sanitize_original_filename(&input.original_filename);
    let size = input.data.len();
    if size == 0 {
        return Err(DomainError::Validation("the uploaded file is empty".into()));
    }
    if size > core.settings.max_upload_bytes {
        return Err(DomainError::Validation(format!(
            "the uploaded file exceeds the {} byte limit",
            core.settings.max_upload_bytes
        )));
    }
    let (content_type, extension) = detect_content_type(&input.data).ok_or_else(|| {
        DomainError::Validation(
            "unsupported file type: only PDF, PNG, JPEG and WEBP are accepted".into(),
        )
    })?;
    if let Some(declared) = input.declared_content_type.as_deref() {
        let declared = declared.split(';').next().unwrap_or(declared).trim();
        if !declared.is_empty()
            && declared != "application/octet-stream"
            && declared != content_type
        {
            return Err(DomainError::Validation(
                "file content does not match the declared content type".into(),
            ));
        }
    }

    match core.scanner.scan(&input.data, content_type).await {
        Ok(ScanVerdict::Clean) => {}
        Ok(ScanVerdict::Infected(_)) => {
            return Err(DomainError::Validation(
                "the uploaded file was rejected by the malware scanner".into(),
            ))
        }
        Err(error) => {
            tracing::error!(error = %error, "malware scanner unavailable");
            return Err(DomainError::Internal(
                "the malware scanner is unavailable".into(),
            ));
        }
    }

    let key = storage_key(extension);
    core.storage
        .put(&key, &input.data)
        .await
        .map_err(|e| DomainError::Internal(format!("store upload: {e}")))?;

    let checksum = checksum_sha256(&input.data);
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let (request_id, event_id) = match target {
        Target::Request(id) => (Some(id), None),
        Target::Event(id) => (None, Some(id)),
    };
    let inserted = documents::insert(
        &mut *tx,
        request_id,
        event_id,
        actor.user_id,
        &document_type,
        &original_filename,
        &key,
        content_type,
        size as i64,
        &checksum,
        "clean",
    )
    .await;

    let document = match inserted {
        Ok(document) => document,
        Err(error) => {
            let _ = core.storage.delete(&key).await;
            return Err(error);
        }
    };
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "document.upload",
        "document",
        Some(document.id),
        json!({
            "document_type": document_type,
            "leave_request_id": request_id,
            "event_id": event_id,
            "size_bytes": size,
            "checksum_sha256": checksum,
        }),
    )
    .await?;
    if let Err(error) = tx.commit().await {
        let _ = core.storage.delete(&key).await;
        return Err(db_err(error));
    }
    Ok(document)
}

pub async fn list_for_request(
    core: &Core,
    actor: &Principal,
    leave_request_id: Uuid,
) -> DomainResult<Vec<DocumentRecord>> {
    let request = leave::get(&core.pool, leave_request_id)
        .await?
        .ok_or(DomainError::NotFound)?;
    ensure_access(actor, request.student_id)?;
    documents::list_for_request(&core.pool, leave_request_id).await
}

pub async fn list_for_event(
    core: &Core,
    actor: &Principal,
    event_id: Uuid,
) -> DomainResult<Vec<DocumentRecord>> {
    let event = events::get(&core.pool, event_id)
        .await?
        .ok_or(DomainError::NotFound)?;
    ensure_access(actor, event.student_id)?;
    documents::list_for_event(&core.pool, event_id).await
}

/// Reviewer queue: metadata only, never file contents. HOD/admin can filter to
/// the unverified queue used by the evidence review screen.
pub async fn list_for_review(
    core: &Core,
    actor: &Principal,
    verification_status: Option<&str>,
    page: domain::models::PageParams,
) -> DomainResult<domain::models::Paged<DocumentRecord>> {
    if !actor.can_manage_students() {
        return Err(DomainError::Forbidden);
    }
    let status = verification_status.map(str::trim).filter(|s| !s.is_empty());
    if let Some(status) = status {
        if !matches!(status, "unverified" | "verified" | "rejected") {
            return Err(DomainError::Validation(
                "verification_status must be unverified, verified or rejected".into(),
            ));
        }
    }
    let items = documents::list_all(&core.pool, status, page.limit(), page.offset()).await?;
    let total = documents::count_all(&core.pool, status).await?;
    Ok(domain::models::Paged::new(items, total, page))
}

async fn authorize_document(
    core: &Core,
    actor: &Principal,
    document: &DocumentRecord,
) -> DomainResult<()> {
    if let Some(request_id) = document.leave_request_id {
        let request = leave::get(&core.pool, request_id)
            .await?
            .ok_or(DomainError::NotFound)?;
        return ensure_access(actor, request.student_id);
    }
    if let Some(event_id) = document.event_id {
        let event = events::get(&core.pool, event_id)
            .await?
            .ok_or(DomainError::NotFound)?;
        return ensure_access(actor, event.student_id);
    }
    Err(DomainError::NotFound)
}

/// Authorization happens before reading storage, so an inaccessible document
/// never causes its bytes to be loaded.
pub async fn download(
    core: &Core,
    actor: &Principal,
    id: Uuid,
) -> DomainResult<DownloadedDocument> {
    let document = documents::get(&core.pool, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    authorize_document(core, actor, &document).await?;
    let bytes = core
        .storage
        .get(&document.storage_key)
        .await
        .map_err(|e| DomainError::Internal(format!("read upload: {e}")))?;
    Ok(DownloadedDocument {
        bytes,
        content_type: document.content_type,
        original_filename: document.original_filename,
    })
}

/// Separate verification workflow: uploads begin unverified, and only a
/// student manager/reviewer can verify or reject them with a reason.
pub async fn verify(
    core: &Core,
    actor: &Principal,
    id: Uuid,
    input: DocumentVerification,
) -> DomainResult<DocumentRecord> {
    if !actor.can_manage_students() {
        return Err(DomainError::Forbidden);
    }
    let status = input.status.trim().to_ascii_lowercase();
    if !matches!(status.as_str(), "verified" | "rejected") {
        return Err(DomainError::Validation(
            "status must be verified or rejected".into(),
        ));
    }
    let notes = input
        .review_notes
        .map(|n| n.trim().to_string())
        .filter(|n| !n.is_empty());
    if notes.as_ref().is_some_and(|n| n.chars().count() > 2000) {
        return Err(DomainError::Validation(
            "review_notes must be at most 2000 characters".into(),
        ));
    }
    if status == "rejected" && notes.is_none() {
        return Err(DomainError::Validation(
            "review_notes are required when rejecting a document".into(),
        ));
    }

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let document = documents::get_for_update(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    if document.verification_status != "unverified" {
        return Err(DomainError::Conflict(
            "document has already been reviewed".into(),
        ));
    }
    let updated =
        documents::mark_verification(&mut *tx, id, &status, actor.user_id, notes.as_deref())
            .await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        &format!("document.{status}"),
        "document",
        Some(id),
        json!({ "verification_status": status }),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(updated)
}
