use crate::{context::Core, crypto};
use domain::{
    error::{DomainError, DomainResult},
    models::{LeaveRequest, NewStudent, PageParams, Paged, StudentRecord, UpdateStudent},
    principal::{Principal, Role},
    validation::{
        normalize_indian_mobile, optional_text, require_text, validate_email, validate_register_number,
        validate_semester,
    },
};
use repository::{audit, db_err, leave, parents, sessions, students, users};
use serde::Serialize;
use serde_json::json;
use std::collections::HashSet;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct CreatedStudent {
    pub student: StudentRecord,
    /// Shown exactly once. Only its Argon2id hash is stored.
    pub temporary_password: String,
}

fn require_manager(actor: &Principal) -> DomainResult<()> {
    if actor.can_manage_students() {
        Ok(())
    } else {
        Err(DomainError::Forbidden)
    }
}

struct ValidatedStudent {
    register_number: String,
    name: String,
    email: Option<String>,
    semester: i16,
    section: Option<String>,
    admission_year: Option<i16>,
    parent_name: Option<String>,
    parent_phone: Option<String>,
}

fn validate_new(input: &NewStudent) -> DomainResult<ValidatedStudent> {
    Ok(ValidatedStudent {
        register_number: validate_register_number(&input.register_number)?,
        name: require_text("full_name", &input.full_name, 120)?,
        email: input
            .email
            .as_deref()
            .filter(|e| !e.trim().is_empty())
            .map(validate_email)
            .transpose()?,
        semester: validate_semester(input.semester)?,
        section: optional_text("section", input.section.as_deref(), 10)?,
        admission_year: input.admission_year,
        parent_name: input
            .parent_name
            .as_deref()
            .filter(|v| !v.trim().is_empty())
            .map(|v| v.trim().to_string()),
        parent_phone: input
            .parent_phone
            .as_deref()
            .filter(|v| !v.trim().is_empty())
            .map(|v| v.trim().to_string()),
    })
}

pub async fn create(
    core: &Core,
    actor: &Principal,
    input: NewStudent,
) -> DomainResult<CreatedStudent> {
    require_manager(actor)?;
    let validated = validate_new(&input)?;

    let temporary_password = crypto::temporary_password();
    let hash = crypto::hash_password(temporary_password.clone()).await?;

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let user_id = users::insert_user(
        &mut *tx,
        validated.email.as_deref(),
        &hash,
        &validated.name,
        true,
    )
    .await?;
    users::assign_role(&mut *tx, user_id, Role::Student).await?;
    let id = students::insert(
        &mut *tx,
        user_id,
        &validated.register_number,
        validated.semester,
        validated.section.as_deref(),
        validated.admission_year,
    )
    .await?;

    // Link a parent/guardian contact (with verified consent) so SMS
    // notifications can be delivered for this student.
    if let Some(phone_raw) = validated.parent_phone.as_deref() {
        let phone = normalize_indian_mobile(phone_raw)?;
        let encrypted = crypto::encrypt(&core.settings.phone_key, &phone)?;
        let parent_name = validated
            .parent_name
            .clone()
            .unwrap_or_else(|| format!("Parent of {}", validated.name));
        let parent = parents::insert(
            &mut *tx,
            id,
            &parent_name,
            "parent",
            &encrypted,
            true,
        )
        .await?;
        parents::insert_consent_history(&mut *tx, parent.id, actor.user_id, "consent_given")
            .await?;
        parents::mark_verified(&mut *tx, parent.id).await?;
    }

    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "student.create",
        "student",
        Some(id),
        json!({ "register_number": validated.register_number }),
    )
    .await?;
    let student = students::get(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    tx.commit().await.map_err(db_err)?;
    Ok(CreatedStudent {
        student,
        temporary_password,
    })
}

#[derive(Debug, Serialize)]
pub struct ImportRowResult {
    /// 1-based row number so an operator can point at the imported file.
    pub row: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub register_number: Option<String>,
    /// `created`, `valid` (dry run) or `failed`.
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub student: Option<StudentRecord>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temporary_password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BulkImportResult {
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
    pub dry_run: bool,
    pub rows: Vec<ImportRowResult>,
}

fn import_error(error: DomainError) -> String {
    match error {
        DomainError::Validation(message) | DomainError::Conflict(message) => message,
        _ => "student could not be created".to_string(),
    }
}

/// Imports up to 500 students. Each row is independent so one bad record does
/// not discard the rest of the batch. `dry_run` validates and checks duplicates
/// without creating accounts or issuing credentials.
pub async fn bulk_import(
    core: &Core,
    actor: &Principal,
    inputs: Vec<NewStudent>,
    dry_run: bool,
) -> DomainResult<BulkImportResult> {
    require_manager(actor)?;
    if !actor.has_permission("students:import") {
        return Err(DomainError::Forbidden);
    }
    if inputs.is_empty() {
        return Err(DomainError::Validation(
            "at least one student is required".into(),
        ));
    }
    if inputs.len() > 500 {
        return Err(DomainError::Validation(
            "a bulk import is limited to 500 students".into(),
        ));
    }

    let mut seen = HashSet::new();
    let mut rows = Vec::with_capacity(inputs.len());
    for (index, input) in inputs.into_iter().enumerate() {
        let row = index + 1;
        let validated = match validate_new(&input) {
            Ok(v) => v,
            Err(error) => {
                rows.push(ImportRowResult {
                    row,
                    register_number: Some(input.register_number),
                    status: "failed".into(),
                    student: None,
                    temporary_password: None,
                    error: Some(import_error(error)),
                });
                continue;
            }
        };

        if !seen.insert(validated.register_number.clone()) {
            rows.push(ImportRowResult {
                row,
                register_number: Some(validated.register_number),
                status: "failed".into(),
                student: None,
                temporary_password: None,
                error: Some("duplicate register_number in import file".into()),
            });
            continue;
        }

        if dry_run {
            match students::register_exists(&core.pool, &validated.register_number).await? {
                true => rows.push(ImportRowResult {
                    row,
                    register_number: Some(validated.register_number),
                    status: "failed".into(),
                    student: None,
                    temporary_password: None,
                    error: Some("register_number already exists".into()),
                }),
                false => rows.push(ImportRowResult {
                    row,
                    register_number: Some(validated.register_number),
                    status: "valid".into(),
                    student: None,
                    temporary_password: None,
                    error: None,
                }),
            }
            continue;
        }

        match create(core, actor, input).await {
            Ok(created) => rows.push(ImportRowResult {
                row,
                register_number: Some(created.student.register_number.clone()),
                status: "created".into(),
                student: Some(created.student),
                temporary_password: Some(created.temporary_password),
                error: None,
            }),
            Err(error) => rows.push(ImportRowResult {
                row,
                register_number: Some(validated.register_number),
                status: "failed".into(),
                student: None,
                temporary_password: None,
                error: Some(import_error(error)),
            }),
        }
    }

    let succeeded = rows.iter().filter(|r| r.status != "failed").count();
    let failed = rows.len() - succeeded;
    if !dry_run {
        audit::insert(
            &core.pool,
            Some(actor.user_id),
            "student.import",
            "student_import",
            None,
            json!({ "total": rows.len(), "succeeded": succeeded, "failed": failed }),
        )
        .await?;
    }

    Ok(BulkImportResult {
        total: rows.len(),
        succeeded,
        failed,
        dry_run,
        rows,
    })
}

/// Staff can open any student; a student only themselves. Everyone else gets 404, not 403,
/// so the existence of other students' records is not revealed.
pub fn ensure_access(actor: &Principal, student_id: Uuid) -> DomainResult<()> {
    if actor.can_manage_students() || actor.owns_student(student_id) {
        Ok(())
    } else {
        Err(DomainError::NotFound)
    }
}

pub async fn get(core: &Core, actor: &Principal, id: Uuid) -> DomainResult<StudentRecord> {
    ensure_access(actor, id)?;
    students::get(&core.pool, id)
        .await?
        .ok_or(DomainError::NotFound)
}

#[derive(Debug, Default)]
pub struct StudentFilter {
    pub q: Option<String>,
    pub status: Option<String>,
    pub page: PageParams,
}

pub async fn list(
    core: &Core,
    actor: &Principal,
    f: StudentFilter,
) -> DomainResult<Paged<StudentRecord>> {
    require_manager(actor)?;
    let pattern =
        f.q.as_deref()
            .map(str::trim)
            .filter(|q| !q.is_empty())
            .map(students::like_pattern);
    let status = f.status.as_deref();
    if let Some(s) = status {
        if !["active", "inactive", "graduated", "archived"].contains(&s) {
            return Err(DomainError::Validation("unknown status filter".into()));
        }
    }
    let items = students::list(
        &core.pool,
        pattern.as_deref(),
        status,
        f.page.limit(),
        f.page.offset(),
    )
    .await?;
    let total = students::count(&core.pool, pattern.as_deref(), status).await?;
    Ok(Paged::new(items, total, f.page))
}

pub async fn update(
    core: &Core,
    actor: &Principal,
    id: Uuid,
    input: UpdateStudent,
) -> DomainResult<StudentRecord> {
    require_manager(actor)?;
    let name = input
        .full_name
        .as_deref()
        .map(|n| require_text("full_name", n, 120))
        .transpose()?;
    let email = input.email.as_deref().map(validate_email).transpose()?;
    let semester = input.semester.map(validate_semester).transpose()?;
    let section = optional_text("section", input.section.as_deref(), 10)?;
    if let Some(s) = input.status.as_deref() {
        if !["active", "inactive", "graduated"].contains(&s) {
            return Err(DomainError::Validation(
                "status must be active, inactive or graduated (use DELETE to archive)".into(),
            ));
        }
    }

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let current = students::get(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    if current.deleted_at.is_some() {
        return Err(DomainError::Conflict(
            "student is archived; restore first".into(),
        ));
    }
    users::update_identity(&mut *tx, current.user_id, name.as_deref(), email.as_deref()).await?;
    students::update_fields(
        &mut *tx,
        id,
        semester,
        section.as_deref(),
        input.admission_year,
        input.status.as_deref(),
    )
    .await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "student.update",
        "student",
        Some(id),
        json!({}),
    )
    .await?;
    let updated = students::get(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    tx.commit().await.map_err(db_err)?;
    Ok(updated)
}

/// Soft delete: the account is archived and every session revoked, but requests,
/// approvals and audit rows are untouched.
pub async fn deactivate(core: &Core, actor: &Principal, id: Uuid) -> DomainResult<StudentRecord> {
    set_archived(core, actor, id, true).await
}

pub async fn restore(core: &Core, actor: &Principal, id: Uuid) -> DomainResult<StudentRecord> {
    set_archived(core, actor, id, false).await
}

async fn set_archived(
    core: &Core,
    actor: &Principal,
    id: Uuid,
    archived: bool,
) -> DomainResult<StudentRecord> {
    require_manager(actor)?;
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let current = students::get(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    if archived == current.deleted_at.is_some() {
        return Err(DomainError::Conflict(
            if archived {
                "student is already archived"
            } else {
                "student is not archived"
            }
            .into(),
        ));
    }
    students::set_archived(&mut *tx, id, archived).await?;
    users::set_status(
        &mut *tx,
        current.user_id,
        if archived { "archived" } else { "active" },
    )
    .await?;
    if archived {
        sessions::revoke_all(&mut *tx, current.user_id, None).await?;
    }
    let action = if archived {
        "student.deactivate"
    } else {
        "student.restore"
    };
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        action,
        "student",
        Some(id),
        json!({}),
    )
    .await?;
    let updated = students::get(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    tx.commit().await.map_err(db_err)?;
    Ok(updated)
}

/// Issues a fresh temporary password (never reveals the old one) and signs the student out everywhere.
pub async fn reset_password(
    core: &Core,
    actor: &Principal,
    id: Uuid,
) -> DomainResult<CreatedStudent> {
    require_manager(actor)?;
    let temporary_password = crypto::temporary_password();
    let hash = crypto::hash_password(temporary_password.clone()).await?;
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let current = students::get(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    users::update_password(&mut *tx, current.user_id, &hash, true).await?;
    sessions::revoke_all(&mut *tx, current.user_id, None).await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "student.reset_password",
        "student",
        Some(id),
        json!({}),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(CreatedStudent {
        student: current,
        temporary_password,
    })
}

/// A student's complete leave/permission history (staff only here; students use /leave-requests).
pub async fn history(
    core: &Core,
    actor: &Principal,
    id: Uuid,
    page: PageParams,
) -> DomainResult<Paged<LeaveRequest>> {
    require_manager(actor)?;
    students::get(&core.pool, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    let items = leave::list(&core.pool, Some(id), None, page.limit(), page.offset()).await?;
    let total = leave::count(&core.pool, Some(id), None).await?;
    Ok(Paged::new(items, total, page))
}
