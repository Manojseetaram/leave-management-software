use crate::{context::Core, students::ensure_access};
use domain::{
    error::{DomainError, DomainResult},
    models::{EventRecord, NewEvent, PageParams, Paged, UpdateEvent},
    principal::Principal,
    validation::{optional_text, require_text},
};
use repository::{audit, db_err, events, leave};
use serde_json::json;
use uuid::Uuid;

fn validate_website(value: Option<&str>) -> DomainResult<Option<String>> {
    let value = optional_text("event_website", value, 500)?;
    if let Some(url) = &value {
        if !(url.starts_with("https://") || url.starts_with("http://")) {
            return Err(DomainError::Validation(
                "event_website must start with http:// or https://".into(),
            ));
        }
    }
    Ok(value)
}

fn validate_details(value: Option<&str>) -> DomainResult<Option<String>> {
    optional_text("participation_details", value, 4000)
}

fn validate_event_times(
    start_at: chrono::DateTime<chrono::Utc>,
    end_at: chrono::DateTime<chrono::Utc>,
) -> DomainResult<()> {
    if end_at <= start_at {
        return Err(DomainError::Validation(
            "event end_at must be after start_at".into(),
        ));
    }
    if end_at - start_at > chrono::Duration::days(365) {
        return Err(DomainError::Validation(
            "an event cannot span more than 365 days".into(),
        ));
    }
    Ok(())
}

/// Event details belong to an event-permission request. The request remains the
/// authorization anchor: the owner or a student manager may add details.
pub async fn create(core: &Core, actor: &Principal, input: NewEvent) -> DomainResult<EventRecord> {
    let title = require_text("title", &input.title, 200)?;
    let organizer = require_text("organizer", &input.organizer, 200)?;
    let website = validate_website(input.event_website.as_deref())?;
    let location = optional_text("location", input.location.as_deref(), 200)?;
    let details = validate_details(input.participation_details.as_deref())?;
    validate_event_times(input.start_at, input.end_at)?;

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let request = leave::get_for_update(&mut *tx, input.leave_request_id)
        .await?
        .ok_or(DomainError::NotFound)?;
    ensure_access(actor, request.student_id)?;
    if request.request_type != "event_permission" {
        return Err(DomainError::Validation(
            "events can only be attached to an event_permission request".into(),
        ));
    }
    if matches!(request.status.as_str(), "rejected" | "withdrawn") {
        return Err(DomainError::Conflict(
            "event details cannot be added to a closed request".into(),
        ));
    }
    if events::get_by_request(&mut *tx, input.leave_request_id)
        .await?
        .is_some()
    {
        return Err(DomainError::Conflict(
            "event details already exist for this request".into(),
        ));
    }

    let event = events::insert(
        &mut *tx,
        input.leave_request_id,
        request.student_id,
        &title,
        &organizer,
        website.as_deref(),
        location.as_deref(),
        input.start_at,
        input.end_at,
        details.as_deref(),
        actor.user_id,
    )
    .await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "event.create",
        "event",
        Some(event.id),
        json!({ "leave_request_id": input.leave_request_id }),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(event)
}

pub async fn get(core: &Core, actor: &Principal, id: Uuid) -> DomainResult<EventRecord> {
    let event = events::get(&core.pool, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    ensure_access(actor, event.student_id)?;
    Ok(event)
}

pub async fn list(
    core: &Core,
    actor: &Principal,
    page: PageParams,
) -> DomainResult<Paged<EventRecord>> {
    let scope = if actor.can_manage_students() {
        None
    } else if let Some(student_id) = actor.student_id {
        Some(student_id)
    } else {
        return Err(DomainError::Forbidden);
    };
    let items = events::list(&core.pool, scope, page.limit(), page.offset()).await?;
    let total = events::count(&core.pool, scope).await?;
    Ok(Paged::new(items, total, page))
}

pub async fn update(
    core: &Core,
    actor: &Principal,
    id: Uuid,
    input: UpdateEvent,
) -> DomainResult<EventRecord> {
    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let event = events::get(&mut *tx, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    ensure_access(actor, event.student_id)?;

    let title = match input.title.as_deref() {
        Some(v) => require_text("title", v, 200)?,
        None => event.title,
    };
    let organizer = match input.organizer.as_deref() {
        Some(v) => require_text("organizer", v, 200)?,
        None => event.organizer,
    };
    let website = match input.event_website.as_deref() {
        Some(v) => validate_website(Some(v))?,
        None => event.event_website,
    };
    let location = match input.location.as_deref() {
        Some(v) => optional_text("location", Some(v), 200)?,
        None => event.location,
    };
    let details = match input.participation_details.as_deref() {
        Some(v) => validate_details(Some(v))?,
        None => event.participation_details,
    };
    let start_at = input.start_at.unwrap_or(event.start_at);
    let end_at = input.end_at.unwrap_or(event.end_at);
    validate_event_times(start_at, end_at)?;

    let updated = events::update_fields(
        &mut *tx,
        id,
        &title,
        &organizer,
        website.as_deref(),
        location.as_deref(),
        start_at,
        end_at,
        details.as_deref(),
    )
    .await?;
    audit::insert(
        &mut *tx,
        Some(actor.user_id),
        "event.update",
        "event",
        Some(id),
        json!({}),
    )
    .await?;
    tx.commit().await.map_err(db_err)?;
    Ok(updated)
}
