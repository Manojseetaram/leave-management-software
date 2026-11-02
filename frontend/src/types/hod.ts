/** HOD, admin, and notification types. */

import type { ListParams } from './api'
import type { Role, UserProfile } from './auth'
import type { LeaveRequest } from './leave'

/** The roles the backend accepts for a staff account. */
export type StaffRole = Exclude<Role, 'student'>

/** The body of POST /users. */
export interface NewStaffUser {
  email: string
  full_name: string
  roles: StaffRole[]
}

/** The response of POST /users. The password is shown exactly once. */
export interface CreatedStaff {
  user: UserProfile
  roles: StaffRole[]
  temporary_password: string
}

export interface AuditLogEntry {
  id: number
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: unknown
  created_at: string
}

export interface NotificationRecord {
  id: string
  leave_request_id: string
  event_type: string
  channel: string
  status: string
  provider_message_id: string | null
  attempt_count: number
  last_error: string | null
  created_at: string
  sent_at: string | null
}

export interface NotificationAttempt {
  id: number
  notification_id: string
  attempt_number: number
  status: string
  provider_message_id: string | null
  error: string | null
  attempted_at: string
}

export interface NotificationDetail extends NotificationRecord {
  attempts: NotificationAttempt[]
}

/** Query parameters accepted by GET /notifications. */
export interface NotificationListParams extends ListParams {
  status?: string
  event_type?: string
}

/** Query parameters accepted by GET /admin/audit-logs. */
export interface AuditLogListParams extends ListParams {
  entity_type?: string
}

export interface DashboardCounts {
  total_students: number
  active_students: number
  pending_requests: number
  approved_requests: number
  completed_requests: number
  unverified_documents: number
  queued_notifications: number
  failed_notifications: number
}

export interface Dashboard {
  counts: DashboardCounts
  recent_pending: LeaveRequest[]
}

export interface LeaveReportSummary {
  total: number
  pending: number
  changes_requested: number
  approved: number
  rejected: number
  withdrawn: number
  completed: number
  personal_leave: number
  medical_leave: number
  event_permission: number
  other: number
}

export interface LeaveReport {
  summary: LeaveReportSummary
  /** The paginated report rows are flattened into the same envelope. */
  items: LeaveRequest[]
  total: number
  page: number
  per_page: number
}

/** Query parameters accepted by GET /admin/reports/leaves. */
export interface LeaveReportQuery extends ListParams {
  from?: string
  to?: string
  status?: string
  request_type?: string
  student_id?: string
  sort?: string
}
