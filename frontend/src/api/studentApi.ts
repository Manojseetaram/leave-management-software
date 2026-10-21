import { request } from './client'

import type { ListParams, Paged } from '../types/api'
import type { LeaveRequest } from '../types/leave'
import type {
  CreatedStudent,
  NewStudent,
  ParentContact,
  StudentListParams,
  StudentRecord,
  UpdateStudent,
} from '../types/student'

/** GET /students — HOD and admin only; faculty and students are refused. */
export const list = (params?: StudentListParams) =>
  request<Paged<StudentRecord>>('/students', {
    query: {
      q: params?.q,
      status: params?.status,
      page: params?.page,
      per_page: params?.per_page,
    },
  })

/** GET /students/:id */
export const show = (id: string) => request<StudentRecord>(`/students/${id}`)

/** POST /students — the temporary password is returned exactly once. */
export const create = (body: NewStudent) =>
  request<CreatedStudent>('/students', { method: 'POST', body })

/** PATCH /students/:id */
export const update = (id: string, body: UpdateStudent) =>
  request<StudentRecord>(`/students/${id}`, { method: 'PATCH', body })

/** DELETE /students/:id — archives the student. */
export const deactivate = (id: string) =>
  request<StudentRecord>(`/students/${id}`, { method: 'DELETE' })

/** POST /students/:id/restore */
export const restore = (id: string) =>
  request<StudentRecord>(`/students/${id}/restore`, { method: 'POST' })

/** POST /students/:id/reset-password — the server generates the password. */
export const resetPassword = (id: string) =>
  request<CreatedStudent>(`/students/${id}/reset-password`, { method: 'POST' })

/** GET /students/:id/history — the leave requests of one student. */
export const history = (id: string, params?: ListParams) =>
  request<Paged<LeaveRequest>>(`/students/${id}/history`, {
    query: {
      page: params?.page,
      per_page: params?.per_page,
    },
  })

/** GET /students/:id/parents — the phone number is never exposed. */
export const parents = (id: string) =>
  request<{ items: ParentContact[] }>(`/students/${id}/parents`)
