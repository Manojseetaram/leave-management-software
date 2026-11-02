use crate::{context::Core, crypto, students::ensure_access};
use domain::{
    error::{DomainError, DomainResult},
    models::{NewParent, ParentContact, UpdateParent},
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
    students::get(&mut *tx, input.student_id)
        .await?
        .ok_or(DomainError::NotFound)?;
    let parent = parents::insert(
        &mut *tx,
        input.student_id,
        &name,
        &relationship,
        &encrypted,
        input.sms_consent,
    )
    .await?;
    if input.sms_consent {
        parents::insert_consent_history(&mut *tx, parent.id, actor.user_id, "consent_given")
            .await?;
    }
    // The phone number is never written to the audit log.
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "parent.create",
        "parent",
        Some(parent.id),
        json!({ "student_id": input.student_id, "sms_consent": input.sms_consent }),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(parent)
}

/// Staff attest that they confirmed the number with the parent. Consent must already be recorded.
/// (This is the hook where an OTP-based verification flow would plug in later.)
pub async fn verify(core: &Core, actor: &Principal, id: Uuid) -> DomainResult<ParentContact> {
    if !actor.can_manage_students() {
        return Err(DomainError::Forbidden);
    }
    let parent = parents::get(&core.pool, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    if parent.sms_consent_at.is_none() {
        return Err(DomainError::Conflict(
            "SMS consent must be recorded before verification".into(),
        ));
    }
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let verified = parents::mark_verified(&mut *tx, id).await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "parent.verify",
        "parent",
        Some(id),
        json!({}),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(verified)
}

/// Students may correct their own parent contact and consent; any phone change
/// invalidates the previous staff verification so SMS cannot be sent to an
/// unverified number.
pub async fn update(
    core: &Core,
    actor: &Principal,
    id: Uuid,
    input: UpdateParent,
) -> DomainResult<ParentContact> {
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let existing = parents::get(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    ensure_access(actor, existing.student_id)?;

    let name = match input.full_name.as_deref() {
        Some(value) => Some(require_text("full_name", value, 120)?),
        None => None,
    };
    let relationship = match input.relationship.as_deref() {
        Some(value) => Some(require_text("relationship", value, 40)?),
        None => None,
    };
    let encrypted = match input.phone.as_deref() {
        Some(value) => {
            let phone = normalize_indian_mobile(value)?;
            Some(crypto::encrypt(&core.settings.phone_key, &phone)?)
        }
        None => None,
    };
    let old_consent = existing.sms_consent_at.is_some();

    let updated = parents::update_fields(
        &mut *tx,
        id,
        name.as_deref(),
        relationship.as_deref(),
        encrypted.as_deref(),
        input.active,
        input.sms_consent,
    )
    .await?;

    if let Some(consent) = input.sms_consent {
        if consent != old_consent {
            parents::insert_consent_history(
                &mut *tx,
                id,
                actor.user_id,
                if consent {
                    "consent_given"
                } else {
                    "consent_revoked"
                },
            )
            .await?;
        }
    }
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "parent.update",
        "parent",
        Some(id),
        json!({
            "phone_changed": encrypted.is_some(),
            "consent_changed": input.sms_consent.map(|_| true).unwrap_or(false),
            "active": updated.active,
        }),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(updated)
}

pub async fn list_for_student(
    core: &Core,
    actor: &Principal,
    student_id: Uuid,
) -> DomainResult<Vec<ParentContact>> {
    ensure_access(actor, student_id)?;
    parents::list_for_student(&core.pool, student_id).await
}
