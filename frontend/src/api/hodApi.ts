import { request } from './client'

import type { Paged } from '../types/api'
import type {
  AuditLogEntry,
  AuditLogListParams,
  CreatedStaff,
  NewStaffUser,
  NotificationListParams,
  NotificationRecord,
} from '../types/hod'

/** GET /admin/audit-logs — requires `admin:all` or `reports:view`. */
export const auditLogs = (params?: AuditLogListParams) =>
  request<Paged<AuditLogEntry>>('/admin/audit-logs', {
    query: {
      entity_type: params?.entity_type,
      page: params?.page,
      per_page: params?.per_page,
    },
  })

/** GET /notifications — the parent SMS delivery log. */
export const notifications = (params?: NotificationListParams) =>
  request<Paged<NotificationRecord>>('/notifications', {
    query: {
      page: params?.page,
      per_page: params?.per_page,
    },
  })

/** POST /users — creates an HOD or faculty account. */
export const createStaff = (body: NewStaffUser) =>
  request<CreatedStaff>('/users', { method: 'POST', body })
