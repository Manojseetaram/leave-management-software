use crate::{context::Core, crypto, students::ensure_access};
use domain::{
    error::{DomainError, DomainResult},
    models::{NewParent, ParentContact},
    principal::Principal,
    validation::{normalize_indian_mobile, require_text},
};
use repository::{audit, db_err, parents, students};
use serde_json::json;
use uuid::Uuid;

pub async fn add(core: &Core, actor: &Principal, input: NewParent) -> DomainResult<ParentContact> {
    ensure_access(actor, input.student_id)?;
    let name = require_text("full_name", &input.full_name, 120)?;
    let relationship = require_text("relationship", &input.relationship, 40)?;
    let phone = normalize_indian_mobile(&input.phone)?;
    let encrypted = crypto::encrypt(&core.settings.phone_key, &phone)?;

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    students::get(&mut *tx, input.student_id).await?.ok_or(DomainError::NotFound)?;
    let parent = parents::insert(&mut *tx, input.student_id, &name, &relationship, &encrypted, input.sms_consent).await?;
    // The phone number is never written to the audit log.
    audit::insert(&mut *tx, Some(actor.user_id), "parent.create", "parent", Some(parent.id),
        json!({ "student_id": input.student_id, "sms_consent": input.sms_consent })).await?;
    tx.commit().await.map_err(db_err)?;
    Ok(parent)
}

/// Staff attest that they confirmed the number with the parent. Consent must already be recorded.
/// (This is the hook where an OTP-based verification flow would plug in later.)
pub async fn verify(core: &Core, actor: &Principal, id: Uuid) -> DomainResult<ParentContact> {
    if !actor.can_manage_students() {
        return Err(DomainError::Forbidden);
    }
    let parent = parents::get(&core.pool, id).await?.ok_or(DomainError::NotFound)?;
    if parent.sms_consent_at.is_none() {
        return Err(DomainError::Conflict("SMS consent must be recorded before verification".into()));
    }
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let verified = parents::mark_verified(&mut *tx, id).await?;
    audit::insert(&mut *tx, Some(actor.user_id), "parent.verify", "parent", Some(id), json!({})).await?;
    tx.commit().await.map_err(db_err)?;
    Ok(verified)
}

pub async fn list_for_student(core: &Core, actor: &Principal, student_id: Uuid) -> DomainResult<Vec<ParentContact>> {
    ensure_access(actor, student_id)?;
    parents::list_for_student(&core.pool, student_id).await
}
