/** Faculty types (GET /faculty/students and GET /faculty/leave-requests). */

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

/** A student row on the faculty roster. */
export interface FacultyStudent extends StudentRecord {
  status: 'active' | 'inactive' | 'graduated' | 'archived'
}

/** A reduced leave/permission row for faculty. */
export interface FacultyLeaveRequest {
  id: string
  student_id: string
  register_number: string
  student_name: string
  request_type: string
  start_at: string
  end_at: string
  status: RequestStatus
  submitted_at: string | null
  decided_at: string | null
}
