use crate::{context::Core, students::ensure_access};
use domain::{
    error::{DomainError, DomainResult},
    leave::{next_status, Action, RequestStatus, RequestType},
    models::{LeaveRequest, NewLeave, PageParams, Paged, RequestHistoryEntry, UpdateLeave},
    principal::Principal,
    validation::validate_leave,
};
use repository::{audit, db_err, leave, notifications};
use serde_json::json;
use uuid::Uuid;

fn parse_status(s: &str) -> DomainResult<RequestStatus> {
    RequestStatus::parse(s)
        .ok_or_else(|| DomainError::Internal(format!("unknown status '{s}' in database")))
}

fn parse_type(s: &str) -> DomainResult<RequestType> {
    RequestType::parse(s).ok_or_else(|| {
        DomainError::Validation(
            "request_type must be personal_leave, medical_leave, event_permission or other".into(),
        )
    })
}

/// Owner or staff-manager may act; everyone else sees a 404.
fn authorize_owner_or_staff(actor: &Principal, req: &LeaveRequest) -> DomainResult<()> {
    ensure_access(actor, req.student_id)
}

fn authorize_action(actor: &Principal, req: &LeaveRequest, action: Action) -> DomainResult<()> {
    if action.is_decision() {
        if actor.can_decide_requests() {
            return Ok(());
        }
        // The owner / staff learn they lack the right (403); strangers learn nothing (404).
        return match authorize_owner_or_staff(actor, req) {
            Ok(()) => Err(DomainError::Forbidden),
            Err(e) => Err(e),
        };
    }
    authorize_owner_or_staff(actor, req)
}

pub async fn create(core: &Core, actor: &Principal, input: NewLeave) -> DomainResult<LeaveRequest> {
    let student_id = match (actor.student_id, input.student_id) {
        (Some(own), None) => own,
        (Some(own), Some(given)) if own == given => own,
        (Some(_), Some(_)) => return Err(DomainError::NotFound),
        (None, Some(given)) if actor.can_manage_students() => given,
        (None, _) if actor.can_manage_students() => {
            return Err(DomainError::Validation(
                "student_id is required when creating on behalf of a student".into(),
            ))
        }
        (None, _) => return Err(DomainError::Forbidden),
    };
    let rtype = parse_type(&input.request_type)?;
    let (reason, destination) = validate_leave(
        &input.reason,
        input.destination.as_deref(),
        input.start_at,
        input.end_at,
    )?;

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let student = repository::students::get(&mut *tx, student_id)
        .await?
        .ok_or(DomainError::NotFound)?;
    if student.deleted_at.is_some() || student.status != "active" {
        return Err(DomainError::Conflict(
            "student account is not active".into(),
        ));
    }
    let req = leave::insert(
        &mut *tx,
        student_id,
        rtype.as_str(),
        &reason,
        destination.as_deref(),
        input.start_at,
        input.end_at,
    )
    .await?;
    leave::insert_history(&mut *tx, req.id, actor.user_id, None, "draft", None).await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "leave.create",
        "leave_request",
        Some(req.id),
        json!({ "type": rtype.as_str() }),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(req)
}

pub async fn get(core: &Core, actor: &Principal, id: Uuid) -> DomainResult<LeaveRequest> {
    let req = leave::get(&core.pool, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    authorize_owner_or_staff(actor, &req)?;
    Ok(req)
}

#[derive(Debug, Default)]
pub struct LeaveFilter {
    pub status: Option<String>,
    pub page: PageParams,
}

pub async fn list(
    core: &Core,
    actor: &Principal,
    f: LeaveFilter,
) -> DomainResult<Paged<LeaveRequest>> {
    // Students are always scoped to themselves, whatever they ask for.
    let scope = if actor.can_manage_students() {
        None
    } else if let Some(own) = actor.student_id {
        Some(own)
    } else {
        return Err(DomainError::Forbidden);
    };
    if let Some(s) = f.status.as_deref() {
        parse_status(s).map_err(|_| DomainError::Validation("unknown status filter".into()))?;
    }
    let items = leave::list(
        &core.pool,
        scope,
        f.status.as_deref(),
        f.page.limit(),
        f.page.offset(),
    )
    .await?;
    let total = leave::count(&core.pool, scope, f.status.as_deref()).await?;
    Ok(Paged::new(items, total, f.page))
}

pub async fn history(
    core: &Core,
    actor: &Principal,
    id: Uuid,
) -> DomainResult<Vec<RequestHistoryEntry>> {
    get(core, actor, id).await?;
    leave::list_history(&core.pool, id).await
}

/// Only drafts and returned requests are editable; an approved request can never be changed.
pub async fn update(
    core: &Core,
    actor: &Principal,
    id: Uuid,
    input: UpdateLeave,
) -> DomainResult<LeaveRequest> {
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let req = leave::get_for_update(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    authorize_owner_or_staff(actor, &req)?;
    if !parse_status(&req.status)?.is_editable() {
        return Err(DomainError::Conflict(format!(
            "a {} request cannot be edited",
            req.status
        )));
    }
    let rtype = match input.request_type.as_deref() {
        Some(t) => parse_type(t)?.as_str().to_string(),
        None => req.request_type.clone(),
    };
    let start_at = input.start_at.unwrap_or(req.start_at);
    let end_at = input.end_at.unwrap_or(req.end_at);
    let reason_in = input.reason.as_deref().unwrap_or(&req.reason);
    let dest_in = input.destination.as_deref().or(req.destination.as_deref());
    let (reason, destination) = validate_leave(reason_in, dest_in, start_at, end_at)?;

    let updated = leave::update_fields(
        &mut *tx,
        id,
        &rtype,
        &reason,
        destination.as_deref(),
        start_at,
        end_at,
    )
    .await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "leave.update",
        "leave_request",
        Some(id),
        json!({}),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(updated)
}

/// Every state change goes through here: lock row -> authorize -> validate transition ->
/// update + history + audit + SMS queue, all in ONE transaction.
pub async fn transition(
    core: &Core,
    actor: &Principal,
    id: Uuid,
    action: Action,
    comment: Option<String>,
) -> DomainResult<LeaveRequest> {
    let comment = comment
        .map(|c| c.trim().to_string())
        .filter(|c| !c.is_empty());
    if action.requires_comment() && comment.is_none() {
        return Err(DomainError::Validation(
            "a reason/comment is required for this action".into(),
        ));
    }

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let req = leave::get_for_update(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    authorize_action(actor, &req, action)?;

    let current = parse_status(&req.status)?;
    let next = next_status(current, action)?;

    let decision = action
        .is_decision()
        .then_some((actor.user_id, comment.as_deref()));
    let updated = leave::set_status(
        &mut *tx,
        id,
        next.as_str(),
        action == Action::Submit,
        decision,
    )
    .await?;
    leave::insert_history(
        &mut *tx,
        id,
        actor.user_id,
        Some(current.as_str()),
        next.as_str(),
        comment.as_deref(),
    )
    .await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        &format!("leave.{}", next.as_str()),
        "leave_request",
        Some(id),
        json!({ "from": current.as_str(), "to": next.as_str() }),
    )
    .await?;
    if let Some(event) = action.notification_event() {
        notifications::enqueue_for_request(&mut *tx, id, event).await?;
    }
    tx.commit().await.map_err(db_err)?;
    Ok(updated)
}
