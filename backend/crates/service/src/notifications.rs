use crate::{context::Core, crypto};
use async_trait::async_trait;
use chrono::{DateTime, FixedOffset, Utc};
use domain::{
    error::{DomainError, DomainResult},
    models::{NotificationDetail, NotificationRecord, PageParams, Paged, SmsDeliveryCallback},
    principal::Principal,
};
use repository::{audit, db_err, notifications};
use serde_json::json;
use std::sync::{
    atomic::{AtomicU32, Ordering},
    Mutex,
};

/// Provider-independent SMS gateway. A real adapter (MSG91, Twilio, ...) implements this;
/// it must use DLT-registered templates whose text matches `render_message` exactly.
#[async_trait]
pub trait SmsProvider: Send + Sync {
    /// Returns the provider's message id on success, or an error description.
    async fn send(&self, to: &str, body: &str) -> Result<String, String>;
}

#[derive(Debug, Clone)]
pub struct SentSms {
    pub to: String,
    pub body: String,
}

/// Development/test provider. Records messages in memory and can simulate gateway failures.
#[derive(Default)]
pub struct MockSmsProvider {
    sent: Mutex<Vec<SentSms>>,
    failures_left: AtomicU32,
}

impl MockSmsProvider {
    pub fn fail_next(&self, n: u32) {
        self.failures_left.store(n, Ordering::SeqCst);
    }
    pub fn sent(&self) -> Vec<SentSms> {
        self.sent.lock().unwrap().clone()
    }
}

#[async_trait]
impl SmsProvider for MockSmsProvider {
    async fn send(&self, to: &str, body: &str) -> Result<String, String> {
        if self.failures_left.load(Ordering::SeqCst) > 0 {
            self.failures_left.fetch_sub(1, Ordering::SeqCst);
            return Err("mock gateway failure".into());
        }
        let mut sent = self.sent.lock().unwrap();
        sent.push(SentSms {
            to: to.to_string(),
            body: body.to_string(),
        });
        Ok(format!("mock-{}", sent.len()))
    }
}

fn fmt_date(d: DateTime<Utc>) -> String {
    let ist = FixedOffset::east_opt(5 * 3600 + 1800).expect("valid offset");
    d.with_timezone(&ist).format("%d-%m-%Y").to_string()
}

/// SMS text. Deliberately contains no reason, destination or medical detail.
pub fn render_message(
    event: &str,
    student: &str,
    register_number: &str,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> Option<String> {
    let (s, e) = (fmt_date(start), fmt_date(end));
    Some(match event {
        "request_submitted" => format!(
            "Dear Parent/Guardian, a leave/permission request has been submitted by {student} ({register_number}) for {s} to {e}. The request is pending HOD approval. Please contact the department if clarification is required."
        ),
        "request_approved" => format!(
            "Dear Parent/Guardian, the leave/permission request for {student} has been approved by the HOD for {s} to {e}. Please refer to the official department portal for details."
        ),
        "request_rejected" => format!(
            "Dear Parent/Guardian, the leave/permission request for {student} for {s} to {e} was not approved. Please contact the department or refer to the official portal for further information."
        ),
        "changes_requested" => format!(
            "Dear Parent/Guardian, the department has asked {student} for additional information about the leave/permission request for {s} to {e}. Please refer to the official portal for details."
        ),
        "request_completed" => format!(
            "Dear Parent/Guardian, the leave/permission for {student} ({register_number}) covering {s} to {e} has been recorded as completed or returned. Please refer to the official department portal for details."
        ),
        _ => return None,
    })
}

fn backoff_secs(attempt: i32) -> f64 {
    (30.0 * 2f64.powi((attempt - 1).max(0))).min(3600.0)
}

/// One dispatcher tick: claim due messages, send, record the outcome.
/// Failures are retried with exponential backoff until `sms_max_attempts`.
pub async fn process_batch(core: &Core, batch: i64) -> DomainResult<usize> {
    let items = notifications::claim_due(&core.pool, batch, core.settings.sms_max_attempts).await?;
    let count = items.len();
    for item in items {
        let outcome: Result<String, String> = async {
            let phone = crypto::decrypt(&core.settings.phone_key, &item.phone_encrypted)
                .map_err(|e| e.to_string())?;
            let body = render_message(
                &item.event_type,
                &item.student_name,
                &item.register_number,
                item.start_at,
                item.end_at,
            )
            .ok_or_else(|| format!("unknown event type '{}'", item.event_type))?;
            core.sms.send(&phone, &body).await
        }
        .await;
        match outcome {
            Ok(message_id) => {
                notifications::mark_sent(&core.pool, item.id, &message_id).await?;
                notifications::record_attempt(&core.pool, item.id, "sent", Some(&message_id), None)
                    .await?;
            }
            Err(err) => {
                tracing::warn!(notification_id = %item.id, attempt = item.attempt_count, "sms failed: {err}");
                notifications::mark_failed(
                    &core.pool,
                    item.id,
                    &err,
                    backoff_secs(item.attempt_count),
                )
                .await?;
                notifications::record_attempt(&core.pool, item.id, "failed", None, Some(&err))
                    .await?;
            }
        }
    }
    Ok(count)
}

#[derive(Default)]
pub struct NotificationFilter {
    pub status: Option<String>,
    pub event_type: Option<String>,
}

pub async fn list(
    core: &Core,
    actor: &Principal,
    filter: &NotificationFilter,
    page: PageParams,
) -> DomainResult<Paged<NotificationRecord>> {
    if !actor.can_manage_students() {
        return Err(DomainError::Forbidden);
    }
    let status = filter
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let event_type = filter
        .event_type
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let items =
        notifications::list(&core.pool, status, event_type, page.limit(), page.offset()).await?;
    let total = notifications::count(&core.pool, status, event_type).await?;
    Ok(Paged::new(items, total, page))
}

pub async fn show(
    core: &Core,
    actor: &Principal,
    id: uuid::Uuid,
) -> DomainResult<NotificationDetail> {
    if !actor.can_manage_students() {
        return Err(DomainError::Forbidden);
    }
    let notification = notifications::get(&core.pool, id)
        .await?
        .ok_or(DomainError::NotFound)?;
    let attempts = notifications::attempts(&core.pool, id).await?;
    Ok(NotificationDetail {
        notification,
        attempts,
    })
}

/// Verifies the gateway signature over the exact raw body, validates the
/// provider and status, then applies the callback idempotently. Callbacks never
/// expose phone numbers or message text in logs or audit metadata.
pub async fn handle_delivery_callback(
    core: &Core,
    provider: &str,
    signature: Option<&str>,
    body: &[u8],
) -> DomainResult<NotificationDetail> {
    if !provider.eq_ignore_ascii_case(&core.settings.sms_provider) {
        return Err(DomainError::NotFound);
    }
    let secret = core
        .settings
        .sms_webhook_secret
        .as_deref()
        .ok_or_else(|| DomainError::Unavailable("SMS callbacks are not configured".into()))?;
    let signature = signature.ok_or(DomainError::Unauthenticated)?;
    if !crypto::verify_hmac_sha256(secret, body, signature) {
        return Err(DomainError::Unauthenticated);
    }

    let callback: SmsDeliveryCallback = serde_json::from_slice(body)
        .map_err(|_| DomainError::Validation("invalid callback body".into()))?;
    let status = callback.status.trim().to_ascii_lowercase();
    if !matches!(status.as_str(), "delivered" | "failed") {
        return Err(DomainError::Validation(
            "callback status must be delivered or failed".into(),
        ));
    }
    let provider_message_id = callback.provider_message_id.trim();
    if provider_message_id.is_empty() || provider_message_id.len() > 255 {
        return Err(DomainError::Validation(
            "provider_message_id is required".into(),
        ));
    }
    let error = callback
        .error
        .map(|e| e.trim().to_string())
        .filter(|e| !e.is_empty());
    if error.as_ref().is_some_and(|e| e.chars().count() > 1000) {
        return Err(DomainError::Validation(
            "callback error must be at most 1000 characters".into(),
        ));
    }

    let mut tx = core.pool.begin().await.map_err(db_err)?;
    let notification = notifications::find_by_provider_message_id(&mut *tx, provider_message_id)
        .await?
        .ok_or(DomainError::NotFound)?;
    let idempotency_key = format!(
        "{}:{}:{}",
        provider.to_ascii_lowercase(),
        provider_message_id,
        status
    );
    let maybe_updated = notifications::apply_delivery_callback(
        &mut *tx,
        notification.id,
        &status,
        error.as_deref(),
        &idempotency_key,
    )
    .await?;

    if maybe_updated.is_some() {
        let attempt_status = if status == "delivered" {
            "delivered"
        } else {
            "callback_failed"
        };
        notifications::record_attempt(
            &mut *tx,
            notification.id,
            attempt_status,
            Some(provider_message_id),
            error.as_deref(),
        )
        .await?;
        audit::insert(
            &mut *tx,
            None,
            "notification.callback",
            "notification",
            Some(notification.id),
            json!({ "provider": provider, "status": status }),
        )
        .await?;
    }
    let current = notifications::get(&mut *tx, notification.id)
        .await?
        .ok_or(DomainError::NotFound)?;
    let attempts = notifications::attempts(&mut *tx, notification.id).await?;
    tx.commit().await.map_err(db_err)?;
    Ok(NotificationDetail {
        notification: current,
        attempts,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn d(day: u32, h: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2030, 1, day, h, 0, 0).unwrap()
    }

    #[test]
    fn submitted_message_matches_template_and_uses_ist_dates() {
        // 20:00 UTC on the 9th is already the 10th in IST.
        let m = render_message(
            "request_submitted",
            "Asha K",
            "1AB22IS001",
            d(9, 20),
            d(12, 4),
        )
        .unwrap();
        assert!(m.starts_with("Dear Parent/Guardian, a leave/permission request has been submitted by Asha K (1AB22IS001)"));
        assert!(m.contains("10-01-2030 to 12-01-2030"));
        assert!(m.contains("pending HOD approval"));
    }

    #[test]
    fn decision_messages_exist_and_unknown_events_do_not() {
        assert!(
            render_message("request_approved", "A", "R", d(1, 1), d(2, 1))
                .unwrap()
                .contains("has been approved")
        );
        assert!(
            render_message("request_rejected", "A", "R", d(1, 1), d(2, 1))
                .unwrap()
                .contains("was not approved")
        );
        assert!(render_message("changes_requested", "A", "R", d(1, 1), d(2, 1)).is_some());
        assert!(render_message("something_else", "A", "R", d(1, 1), d(2, 1)).is_none());
    }

    #[test]
    fn messages_never_leak_reason_or_medical_words() {
        for ev in [
            "request_submitted",
            "request_approved",
            "request_rejected",
            "changes_requested",
        ] {
            let m = render_message(ev, "A", "R", d(1, 1), d(2, 1))
                .unwrap()
                .to_lowercase();
            assert!(!m.contains("medical") && !m.contains("certificate") && !m.contains("reason"));
        }
    }

    #[test]
    fn backoff_grows_and_is_capped() {
        assert_eq!(backoff_secs(1), 30.0);
        assert_eq!(backoff_secs(2), 60.0);
        assert_eq!(backoff_secs(3), 120.0);
        assert_eq!(backoff_secs(30), 3600.0);
    }

    #[tokio::test]
    async fn mock_provider_records_and_fails_on_demand() {
        let p = MockSmsProvider::default();
        p.fail_next(1);
        assert!(p.send("+911", "x").await.is_err());
        assert_eq!(p.send("+911", "x").await.unwrap(), "mock-1");
        assert_eq!(p.sent().len(), 1);
    }
}
