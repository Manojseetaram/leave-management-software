use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------- read models (rows map straight onto these when the `sqlx` feature is on) ----------

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct UserProfile {
    pub id: Uuid,
    pub email: Option<String>,
    pub full_name: String,
    pub status: String,
    pub must_change_password: bool,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct StudentRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub register_number: String,
    pub full_name: String,
    pub email: Option<String>,
    pub department: String,
    pub semester: i16,
    pub section: Option<String>,
    pub admission_year: Option<i16>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct LeaveRequest {
    pub id: Uuid,
    pub student_id: Uuid,
    pub request_type: String,
    pub reason: String,
    pub destination: Option<String>,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub status: String,
    pub submitted_at: Option<DateTime<Utc>>,
    pub decided_by: Option<Uuid>,
    pub decided_at: Option<DateTime<Utc>>,
    pub decision_reason: Option<String>,
    /// Completion/return is deliberately separate from the original decision.
    pub completed_at: Option<DateTime<Utc>>,
    pub completed_by: Option<Uuid>,
    pub completion_note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct RequestHistoryEntry {
    pub id: Uuid,
    pub leave_request_id: Uuid,
    pub actor_id: Uuid,
    /// The named action that produced this entry, e.g. `submit` or `return`.
    pub action: Option<String>,
    pub old_status: Option<String>,
    pub new_status: String,
    pub comment: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Deliberately reduced student view for faculty. Email and archive state are
/// excluded because faculty are only entitled to attendance-relevant fields.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct FacultyStudent {
    pub id: Uuid,
    pub register_number: String,
    pub full_name: String,
    pub department: String,
    pub semester: i16,
    pub section: Option<String>,
    pub admission_year: Option<i16>,
    pub status: String,
}

/// Reduced leave/permission view for faculty: status and dates only, with no
/// reason, destination, documents or decision notes.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct FacultyLeaveRequest {
    pub id: Uuid,
    pub student_id: Uuid,
    pub register_number: String,
    pub student_name: String,
    pub request_type: String,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub status: String,
    pub submitted_at: Option<DateTime<Utc>>,
    pub decided_at: Option<DateTime<Utc>>,
}

/// Parent contact as exposed by the API. The phone number is deliberately absent.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct ParentContact {
    pub id: Uuid,
    pub student_id: Uuid,
    pub full_name: String,
    pub relationship: String,
    pub verified_at: Option<DateTime<Utc>>,
    pub sms_consent_at: Option<DateTime<Utc>>,
    pub active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct SessionInfo {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub current: bool,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct AuditLogEntry {
    pub id: i64,
    pub actor_id: Option<Uuid>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct DashboardCounts {
    pub total_students: i64,
    pub active_students: i64,
    pub pending_requests: i64,
    pub approved_requests: i64,
    pub completed_requests: i64,
    pub unverified_documents: i64,
    pub queued_notifications: i64,
    pub failed_notifications: i64,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct LeaveReportSummary {
    pub total: i64,
    pub pending: i64,
    pub changes_requested: i64,
    pub approved: i64,
    pub rejected: i64,
    pub withdrawn: i64,
    pub completed: i64,
    pub personal_leave: i64,
    pub medical_leave: i64,
    pub event_permission: i64,
    pub other: i64,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct EventRecord {
    pub id: Uuid,
    pub leave_request_id: Uuid,
    pub student_id: Uuid,
    pub title: String,
    pub organizer: String,
    pub event_website: Option<String>,
    pub location: Option<String>,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub participation_details: Option<String>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct DocumentRecord {
    pub id: Uuid,
    pub leave_request_id: Option<Uuid>,
    pub event_id: Option<Uuid>,
    pub uploader_id: Uuid,
    pub document_type: String,
    pub original_filename: String,
    pub content_type: String,
    pub size_bytes: i64,
    pub checksum_sha256: String,
    pub malware_scan_status: String,
    pub verification_status: String,
    pub verified_by: Option<Uuid>,
    pub verified_at: Option<DateTime<Utc>>,
    pub review_notes: Option<String>,
    pub created_at: DateTime<Utc>,
    /// Never serialized to API clients.
    #[serde(skip_serializing)]
    pub storage_key: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct NotificationRecord {
    pub id: Uuid,
    pub leave_request_id: Uuid,
    pub event_type: String,
    pub channel: String,
    pub status: String,
    pub provider_message_id: Option<String>,
    pub attempt_count: i32,
    pub last_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub sent_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
pub struct NotificationAttempt {
    pub id: i64,
    pub notification_id: Uuid,
    pub attempt_number: i32,
    pub status: String,
    pub provider_message_id: Option<String>,
    pub error: Option<String>,
    pub attempted_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NotificationDetail {
    #[serde(flatten)]
    pub notification: NotificationRecord,
    pub attempts: Vec<NotificationAttempt>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SmsDeliveryCallback {
    pub provider_message_id: String,
    /// `delivered` or `failed`.
    pub status: String,
    pub error: Option<String>,
}

// ---------- commands (request bodies) ----------

#[derive(Debug, Clone, Deserialize)]
pub struct NewStaffUser {
    pub email: String,
    pub full_name: String,
    /// Any of `admin`, `hod`, `faculty`.
    pub roles: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewStudent {
    pub register_number: String,
    pub full_name: String,
    pub email: Option<String>,
    pub semester: i16,
    pub section: Option<String>,
    pub admission_year: Option<i16>,
    #[serde(default)]
    pub parent_name: Option<String>,
    #[serde(default)]
    pub parent_phone: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct UpdateStudent {
    pub full_name: Option<String>,
    pub email: Option<String>,
    pub semester: Option<i16>,
    pub section: Option<String>,
    pub admission_year: Option<i16>,
    /// `active`, `inactive` or `graduated`. Archiving goes through DELETE.
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewLeave {
    /// Staff creating on behalf of a student must provide this; students may omit it.
    pub student_id: Option<Uuid>,
    pub request_type: String,
    pub reason: String,
    pub destination: Option<String>,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct UpdateLeave {
    pub request_type: Option<String>,
    pub reason: Option<String>,
    pub destination: Option<String>,
    pub start_at: Option<DateTime<Utc>>,
    pub end_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewParent {
    pub student_id: Uuid,
    pub full_name: String,
    pub relationship: String,
    pub phone: String,
    #[serde(default)]
    pub sms_consent: bool,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct UpdateParent {
    pub full_name: Option<String>,
    pub relationship: Option<String>,
    pub phone: Option<String>,
    pub sms_consent: Option<bool>,
    pub active: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewEvent {
    pub leave_request_id: Uuid,
    pub title: String,
    pub organizer: String,
    pub event_website: Option<String>,
    pub location: Option<String>,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub participation_details: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct UpdateEvent {
    pub title: Option<String>,
    pub organizer: Option<String>,
    pub event_website: Option<String>,
    pub location: Option<String>,
    pub start_at: Option<DateTime<Utc>>,
    pub end_at: Option<DateTime<Utc>>,
    pub participation_details: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DocumentVerification {
    /// `verified` or `rejected`.
    pub status: String,
    pub review_notes: Option<String>,
}

// ---------- pagination ----------

#[derive(Debug, Clone, Copy, Default)]
pub struct PageParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

impl PageParams {
    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }
    pub fn limit(&self) -> i64 {
        self.per_page.unwrap_or(20).clamp(1, 100)
    }
    pub fn offset(&self) -> i64 {
        (self.page() - 1) * self.limit()
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Paged<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

impl<T> Paged<T> {
    pub fn new(items: Vec<T>, total: i64, params: PageParams) -> Self {
        Self {
            items,
            total,
            page: params.page(),
            per_page: params.limit(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paging_is_clamped() {
        let p = PageParams {
            page: Some(0),
            per_page: Some(1000),
        };
        assert_eq!((p.page(), p.limit(), p.offset()), (1, 100, 0));
        let p = PageParams {
            page: Some(3),
            per_page: Some(10),
        };
        assert_eq!(p.offset(), 20);
        let p = PageParams::default();
        assert_eq!((p.page(), p.limit()), (1, 20));
    }
}
