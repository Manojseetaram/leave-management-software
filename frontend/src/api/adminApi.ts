import { request } from './client'

import type { Dashboard, LeaveReport, LeaveReportQuery, NotificationRecord } from '../types/hod'
import type { AuditLogEntry } from '../types/hod'
import type { DocumentListParams, DocumentRecord } from '../types/document'
import type { Paged } from '../types/api'

/** GET /admin/dashboard — department counts and the newest pending requests. */
export const dashboard = () => request<Dashboard>('/admin/dashboard')

/** GET /admin/reports/leaves — filtered, sorted paginated leave report. */
export const leaveReport = (query?: LeaveReportQuery) =>
  request<LeaveReport>('/admin/reports/leaves', {
    query: query as Record<string, string | number | boolean | null | undefined>,
  })

/** GET /admin/audit-logs. */
export const auditLogs = (params?: {
  entity_type?: string
  page?: number
  per_page?: number
}) => request<Paged<AuditLogEntry>>('/admin/audit-logs', { query: params })

/** GET /notifications. */
export const notifications = (params?: {
  status?: string
  event_type?: string
  page?: number
  per_page?: number
}) => request<Paged<NotificationRecord>>('/notifications', { query: params })

/** GET /admin/documents — reviewer queue. */
export const documents = (params?: DocumentListParams) =>
  request<Paged<DocumentRecord>>('/admin/documents', {
    query: params as Record<string, string | number | boolean | null | undefined> | undefined,
  })
