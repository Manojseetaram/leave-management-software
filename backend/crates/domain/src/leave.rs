use crate::error::{DomainError, DomainResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RequestStatus {
    Draft,
    Pending,
    ChangesRequested,
    Approved,
    Rejected,
    Withdrawn,
    Completed,
}

impl RequestStatus {
    pub const ALL: [RequestStatus; 7] = [
        RequestStatus::Draft,
        RequestStatus::Pending,
        RequestStatus::ChangesRequested,
        RequestStatus::Approved,
        RequestStatus::Rejected,
        RequestStatus::Withdrawn,
        RequestStatus::Completed,
    ];

    pub fn as_str(&self) -> &'static str {
        match self {
            RequestStatus::Draft => "draft",
            RequestStatus::Pending => "pending",
            RequestStatus::ChangesRequested => "changes_requested",
            RequestStatus::Approved => "approved",
            RequestStatus::Rejected => "rejected",
            RequestStatus::Withdrawn => "withdrawn",
            RequestStatus::Completed => "completed",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|v| v.as_str() == s)
    }

    /// Student-editable states. Approved requests are never editable.
    pub fn is_editable(&self) -> bool {
        matches!(self, RequestStatus::Draft | RequestStatus::ChangesRequested)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RequestType {
    PersonalLeave,
    MedicalLeave,
    EventPermission,
    Other,
}

impl RequestType {
    pub fn as_str(&self) -> &'static str {
        match self {
            RequestType::PersonalLeave => "personal_leave",
            RequestType::MedicalLeave => "medical_leave",
            RequestType::EventPermission => "event_permission",
            RequestType::Other => "other",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "personal_leave" => Some(Self::PersonalLeave),
            "medical_leave" => Some(Self::MedicalLeave),
            "event_permission" => Some(Self::EventPermission),
            "other" => Some(Self::Other),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    Submit,
    Withdraw,
    Approve,
    Reject,
    RequestChanges,
    Complete,
}

impl Action {
    pub fn as_str(&self) -> &'static str {
        match self {
            Action::Submit => "submit",
            Action::Withdraw => "withdraw",
            Action::Approve => "approve",
            Action::Reject => "reject",
            Action::RequestChanges => "request changes on",
            Action::Complete => "complete",
        }
    }

    /// Reject / request-changes must carry an explanation.
    pub fn requires_comment(&self) -> bool {
        matches!(self, Action::Reject | Action::RequestChanges)
    }

    /// Reviewer decisions (stamp decided_by / decided_at / decision_reason).
    pub fn is_decision(&self) -> bool {
        matches!(self, Action::Approve | Action::Reject | Action::RequestChanges)
    }

    /// Parent-SMS event triggered by this action, if any.
    pub fn notification_event(&self) -> Option<&'static str> {
        match self {
            Action::Submit => Some("request_submitted"),
            Action::Approve => Some("request_approved"),
            Action::Reject => Some("request_rejected"),
            Action::RequestChanges => Some("changes_requested"),
            Action::Withdraw | Action::Complete => None,
        }
    }
}

/// The single source of truth for the workflow state machine.
/// (The same table is enforced again by a trigger in migration 0002.)
pub fn next_status(current: RequestStatus, action: Action) -> DomainResult<RequestStatus> {
    use Action::*;
    use RequestStatus::*;
    match (current, action) {
        (Draft | ChangesRequested, Submit) => Ok(Pending),
        (Draft | Pending | ChangesRequested, Withdraw) => Ok(Withdrawn),
        (Pending, Approve) => Ok(Approved),
        (Pending, Reject) => Ok(Rejected),
        (Pending, RequestChanges) => Ok(ChangesRequested),
        (Approved, Complete) => Ok(Completed),
        (from, action) => Err(DomainError::Conflict(format!(
            "cannot {} a request that is {}",
            action.as_str(),
            from.as_str()
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use Action::*;
    use RequestStatus::*;

    const VALID: &[(RequestStatus, Action, RequestStatus)] = &[
        (Draft, Submit, Pending),
        (ChangesRequested, Submit, Pending),
        (Draft, Withdraw, Withdrawn),
        (Pending, Withdraw, Withdrawn),
        (ChangesRequested, Withdraw, Withdrawn),
        (Pending, Approve, Approved),
        (Pending, Reject, Rejected),
        (Pending, RequestChanges, ChangesRequested),
        (Approved, Complete, Completed),
    ];

    #[test]
    fn every_valid_transition_is_accepted() {
        for (from, action, to) in VALID {
            assert_eq!(next_status(*from, *action).unwrap(), *to);
        }
    }

    #[test]
    fn every_other_combination_is_rejected() {
        let all_actions = [Submit, Withdraw, Approve, Reject, RequestChanges, Complete];
        for from in RequestStatus::ALL {
            for action in all_actions {
                let valid = VALID.iter().any(|(f, a, _)| *f == from && *a == action);
                assert_eq!(
                    next_status(from, action).is_ok(),
                    valid,
                    "{from:?} + {action:?}"
                );
            }
        }
    }

    #[test]
    fn submitting_is_never_approval() {
        assert_eq!(next_status(Draft, Submit).unwrap(), Pending);
        assert!(next_status(Draft, Approve).is_err());
    }

    #[test]
    fn terminal_states_are_final() {
        for from in [Rejected, Withdrawn, Completed] {
            for action in [Submit, Withdraw, Approve, Reject, RequestChanges, Complete] {
                assert!(next_status(from, action).is_err());
            }
        }
    }

    #[test]
    fn approved_cannot_be_edited_or_resubmitted() {
        assert!(!Approved.is_editable());
        assert!(next_status(Approved, Submit).is_err());
        assert!(Draft.is_editable() && ChangesRequested.is_editable());
    }

    #[test]
    fn status_round_trip() {
        for s in RequestStatus::ALL {
            assert_eq!(RequestStatus::parse(s.as_str()), Some(s));
        }
        assert_eq!(RequestStatus::parse("nope"), None);
    }

    #[test]
    fn comment_and_notification_rules() {
        assert!(Reject.requires_comment() && RequestChanges.requires_comment());
        assert!(!Approve.requires_comment());
        assert_eq!(Submit.notification_event(), Some("request_submitted"));
        assert_eq!(Withdraw.notification_event(), None);
    }
}
