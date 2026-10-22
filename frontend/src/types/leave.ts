/** Leave request types (crates/domain/src/leave.rs, models.rs). */

/** The workflow states, in the order the state machine moves through them. */
export type RequestStatus =
  | 'draft'
  | 'pending'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'completed'

export type RequestType =
  | 'personal_leave'
  | 'medical_leave'
  | 'event_permission'
  | 'other'

/** The actions the leave workflow accepts. */
export type LeaveAction =
  | 'submit'
  | 'withdraw'
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'complete'

export interface LeaveRequest {
  id: string
  student_id: string
  request_type: RequestType
  reason: string
  destination: string | null
  start_at: string
  end_at: string
  status: RequestStatus
  submitted_at: string | null
  decided_by: string | null
  decided_at: string | null
  decision_reason: string | null
  created_at: string
  updated_at: string
}

/** The body of POST /leave-requests. */
export interface NewLeave {
  /** Staff creating on behalf of a student must set this. */
  student_id?: string
  request_type: RequestType
  reason: string
  destination?: string
  start_at: string
  end_at: string
}

/** The body of PATCH /leave-requests/:id. */
export interface UpdateLeave {
  request_type?: RequestType
  reason?: string
  destination?: string
  start_at?: string
  end_at?: string
}

/**
 * The body of the decision endpoints. `comment` is mandatory for
 * reject and request-changes, optional for approve.
 */
export interface DecisionComment {
  comment?: string
}

/**
 * The body of a decision that has to carry a reason. The backend refuses a
 * rejection or a request for changes without one, so the type says so too.
 */
export interface RequiredDecisionComment {
  comment: string
}

export interface HistoryEntry {
  id: string
  leave_request_id: string
  actor_id: string
  old_status: RequestStatus | null
  new_status: RequestStatus
  comment: string | null
  created_at: string
}

/** Query parameters accepted by GET /leave-requests. */
export interface LeaveListParams {
  status?: RequestStatus
  page?: number
  per_page?: number
}

/**
 * The form-level representation of a leave request. The dates are local
 * `datetime-local` values while the user is typing; they are converted to
 * UTC ISO strings before they are sent.
 */
export interface LeaveFormValues {
  request_type: RequestType
  reason: string
  destination: string
  start_at: string
  end_at: string
}
