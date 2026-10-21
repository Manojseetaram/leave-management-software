import { request } from './client'

import type { Paged } from '../types/api'
import type {
  FacultyLeaveListParams,
  FacultyStudentListParams,
  FacultyStudentSummary,
} from '../types/faculty'
import type { LeaveRequest } from '../types/leave'

/**
 * Faculty endpoints.
 *
 * WARNING: these routes do not exist on the backend yet. Faculty currently
 * holds only the `students:read` permission, which no handler honours, so
 * every read a faculty member attempts answers 403 or 404. The contract the
 * backend has to provide is written down in docs/faculty-api-contract.md.
 */

/** GET /faculty/students — the faculty roster. */
export const students = (params?: FacultyStudentListParams) =>
  request<Paged<FacultyStudentSummary>>('/faculty/students', {
    query: {
      q: params?.q,
      semester: params?.semester,
      section: params?.section,
      page: params?.page,
      per_page: params?.per_page,
    },
  })

/** GET /faculty/leave-requests — leave requests of the faculty roster. */
export const leaveRequests = (params?: FacultyLeaveListParams) =>
  request<Paged<LeaveRequest>>('/faculty/leave-requests', {
    query: {
      student_id: params?.student_id,
      status: params?.status,
      page: params?.page,
      per_page: params?.per_page,
    },
  })
