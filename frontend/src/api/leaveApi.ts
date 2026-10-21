import { request } from './client'

import type { Paged } from '../types/api'
import type {
  DecisionComment,
  HistoryEntry,
  LeaveListParams,
  LeaveRequest,
  NewLeave,
  UpdateLeave,
} from '../types/leave'

/**
 * Leave request endpoints.
 *
 * The backend owns the workflow: which transition is allowed from which
 * status is decided by the state machine, and every rejected transition
 * comes back as 409 conflict.
 */

/** GET /leave-requests — scoped to the caller by the backend. */
export const list = (params?: LeaveListParams) =>
  request<Paged<LeaveRequest>>('/leave-requests', {
    query: {
      status: params?.status,
      page: params?.page,
      per_page: params?.per_page,
    },
  })

/** GET /leave-requests/:id */
export const show = (id: string) => request<LeaveRequest>(`/leave-requests/${id}`)

/** POST /leave-requests */
export const create = (body: NewLeave) =>
  request<LeaveRequest>('/leave-requests', { method: 'POST', body })

/** PATCH /leave-requests/:id — only drafts and returned requests are editable. */
export const update = (id: string, body: UpdateLeave) =>
  request<LeaveRequest>(`/leave-requests/${id}`, { method: 'PATCH', body })

/** GET /leave-requests/:id/history */
export const history = (id: string) =>
  request<{ items: HistoryEntry[] }>(`/leave-requests/${id}/history`)

/** POST /leave-requests/:id/submit — draft or changes_requested to pending. */
export const submit = (id: string) =>
  request<LeaveRequest>(`/leave-requests/${id}/submit`, { method: 'POST' })

/** POST /leave-requests/:id/withdraw */
export const withdraw = (id: string) =>
  request<LeaveRequest>(`/leave-requests/${id}/withdraw`, { method: 'POST' })

/** POST /leave-requests/:id/approve — only the HOD. */
export const approve = (id: string, body: DecisionComment = {}) =>
  request<LeaveRequest>(`/leave-requests/${id}/approve`, { method: 'POST', body })

/** POST /leave-requests/:id/reject — only the HOD, a comment is required. */
export const reject = (id: string, body: DecisionComment) =>
  request<LeaveRequest>(`/leave-requests/${id}/reject`, { method: 'POST', body })

/** POST /leave-requests/:id/request-changes — only the HOD, a comment is required. */
export const requestChanges = (id: string, body: DecisionComment) =>
  request<LeaveRequest>(`/leave-requests/${id}/request-changes`, { method: 'POST', body })

/** POST /leave-requests/:id/completion — marks an approved request as completed. */
export const complete = (id: string) =>
  request<LeaveRequest>(`/leave-requests/${id}/completion`, { method: 'POST' })
