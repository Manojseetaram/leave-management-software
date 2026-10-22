/**
 * The visual tone of a status.
 *
 * One map owns the colour of every state the interface can show - a leave
 * request, a student account, a role - so the same meaning always wears the
 * same colour and the three can never drift apart.
 */

import type { RequestStatus } from '../types/leave'
import type { StudentFilterStatus } from '../types/student'

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'warning'
  | 'success'
  | 'danger'
  | 'violet'

/** The pill colours of each tone. */
export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-status-draft-soft text-status-draft',
  info: 'bg-status-completed-soft text-status-completed',
  warning: 'bg-status-pending-soft text-status-pending',
  success: 'bg-status-approved-soft text-status-approved',
  danger: 'bg-status-rejected-soft text-status-rejected',
  violet: 'bg-status-changes-soft text-status-changes',
}

/** The tone of every state of the leave workflow. */
export const REQUEST_STATUS_TONES: Record<RequestStatus, StatusTone> = {
  draft: 'neutral',
  pending: 'warning',
  changes_requested: 'violet',
  approved: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
  completed: 'info',
}

/** The tone of every state of a student account. */
export const STUDENT_STATUS_TONES: Record<StudentFilterStatus, StatusTone> = {
  active: 'success',
  inactive: 'warning',
  graduated: 'info',
  archived: 'neutral',
}
