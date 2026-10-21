/** Student and parent types (crates/api/src/handlers/students.rs, parents.rs). */

import type { ListParams } from './api'

export type StudentStatus = 'active' | 'inactive' | 'graduated'

export interface StudentRecord {
  id: string
  user_id: string
  register_number: string
  full_name: string
  email: string | null
  department: string
  semester: number
  section: string | null
  admission_year: number | null
  status: string
  created_at: string
  deleted_at: string | null
}

/** A parent contact. The phone number is never exposed by the API. */
export interface ParentContact {
  id: string
  student_id: string
  full_name: string
  relationship: string
  verified_at: string | null
  sms_consent_at: string | null
  active: boolean
  created_at: string
}

/** The body of POST /students. */
export interface NewStudent {
  register_number: string
  full_name: string
  email?: string
  semester: number
  section?: string
  admission_year?: number
}

/** The body of PATCH /students/:id. */
export interface UpdateStudent {
  full_name?: string
  email?: string
  semester?: number
  section?: string
  admission_year?: number
  status?: StudentStatus
}

/** The response of POST /students. The password is shown exactly once. */
export interface CreatedStudent {
  student: StudentRecord
  temporary_password: string
}

/** Query parameters accepted by GET /students. */
export interface StudentListParams extends ListParams {
  q?: string
  status?: StudentStatus
}
