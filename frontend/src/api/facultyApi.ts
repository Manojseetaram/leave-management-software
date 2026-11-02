import { request } from './client'

import type { FacultyLeaveRequest, FacultyStudent, FacultyStudentListParams, FacultyLeaveListParams } from '../types/faculty'
import type { Paged } from '../types/api'

/** GET /faculty/students — the faculty roster. */
export const students = (params?: FacultyStudentListParams) =>
  request<Paged<FacultyStudent>>('/faculty/students', {
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
  request<Paged<FacultyLeaveRequest>>('/faculty/leave-requests', {
    query: {
      student_id: params?.student_id,
      status: params?.status,
      page: params?.page,
      per_page: params?.per_page,
    },
  })
