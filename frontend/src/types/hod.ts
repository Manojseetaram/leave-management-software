/** HOD and admin types (crates/api/src/handlers/admin.rs, notifications.rs). */

import type { ListParams } from './api'
import type { Role, UserProfile } from './auth'

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

/** Query parameters accepted by GET /admin/audit-logs. */
export interface AuditLogListParams extends ListParams {
  entity_type?: string
}

/** Query parameters accepted by GET /notifications. */
export interface NotificationListParams extends ListParams {}
