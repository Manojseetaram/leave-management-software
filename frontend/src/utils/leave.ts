/**
 * Leave workflow rules.
 *
 * Every predicate here mirrors the backend state machine in
 * `crates/domain/src/leave.rs`, so the UI only offers an action the server
 * will accept. The backend stays the authority.
 */

import type { RequestStatus, RequestType } from '../types/leave'

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  personal_leave: 'Personal leave',
  medical_leave: 'Medical leave',
  event_permission: 'Event permission',
  other: 'Other',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  completed: 'Completed',
}

/** The statuses a student can filter the request list by. */
export const REQUEST_STATUSES: RequestStatus[] = [
  'draft',
  'pending',
  'changes_requested',
  'approved',
  'rejected',
  'withdrawn',
  'completed',
]

/** The backend refuses a request that spans more than 365 days. */
export const MAX_LEAVE_SPAN_DAYS = 365

/** The backend accepts a reason of at most 2000 characters. */
export const MAX_REASON_LENGTH = 2000

/** The backend accepts a destination of at most 200 characters. */
export const MAX_DESTINATION_LENGTH = 200

/** Mirrors `RequestStatus::is_editable`. */
export function isEditable(status: RequestStatus): boolean {
  return status === 'draft' || status === 'changes_requested'
}

/** Mirrors `next_status(status, Submit)`. */
export function canSubmit(status: RequestStatus): boolean {
  return status === 'draft' || status === 'changes_requested'
}

/** Mirrors `next_status(status, Withdraw)`. */
export function canWithdraw(status: RequestStatus): boolean {
  return status === 'draft' || status === 'pending' || status === 'changes_requested'
}

/** Mirrors `next_status(status, Complete)`. */
export function canComplete(status: RequestStatus): boolean {
  return status === 'approved'
}
