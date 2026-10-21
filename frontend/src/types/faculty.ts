/**
 * Faculty types.
 *
 * NOTE: the backend does not expose any Faculty-scoped endpoint yet. Faculty
 * currently holds only the `students:read` permission, which no handler
 * honours, so every read it attempts answers 403/404. These types describe
 * the contract the backend needs to provide — see
 * docs/faculty-api-contract.md for the matching endpoint and permission list.
 */

import type { ListParams } from './api'
import type { RequestStatus } from './leave'
import type { StudentRecord } from './student'

/** Query parameters accepted by GET /faculty/students. */
export interface FacultyStudentListParams extends ListParams {
  q?: string
  semester?: number
  section?: string
}

/** Query parameters accepted by GET /faculty/leave-requests. */
export interface FacultyLeaveListParams extends ListParams {
  student_id?: string
  status?: RequestStatus
}

/**
 * A row on the Faculty roster: the student record plus the number of leave
 * requests still awaiting a decision.
 */
export interface FacultyStudentSummary extends StudentRecord {
  pending_leave_count: number
}
