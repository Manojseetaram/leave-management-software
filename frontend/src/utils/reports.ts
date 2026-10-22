/**
 * Report helpers.
 *
 * The backend has no report endpoint, so the totals are counted from the
 * leave requests and the parent messages the API already returns. The counts
 * are exact: every page of a list is read before anything is counted, so a
 * report never shows a page of rows as if it were the whole picture.
 */

import { REQUEST_STATUSES, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS } from './leave'

import type { NotificationRecord } from '../types/hod'
import type { LeaveRequest, RequestStatus, RequestType } from '../types/leave'

/** One labelled number in a report table. */
export interface CountRow {
  key: string
  label: string
  count: number
}

/** Every request type the backend accepts. */
export function requestTypes(): RequestType[] {
  return Object.keys(REQUEST_TYPE_LABELS) as RequestType[]
}

/** The number of requests in every workflow state. */
export function countByStatus(requests: LeaveRequest[]): CountRow[] {
  const counts = new Map<RequestStatus, number>(
    REQUEST_STATUSES.map((status) => [status, 0]),
  )

  for (const request of requests) {
    counts.set(request.status, (counts.get(request.status) ?? 0) + 1)
  }

  return REQUEST_STATUSES.map((status) => ({
    key: status,
    label: REQUEST_STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
  }))
}

/** The number of requests of every type. */
export function countByType(requests: LeaveRequest[]): CountRow[] {
  const counts = new Map<RequestType, number>()

  for (const request of requests) {
    counts.set(request.request_type, (counts.get(request.request_type) ?? 0) + 1)
  }

  return requestTypes().map((type) => ({
    key: type,
    label: REQUEST_TYPE_LABELS[type],
    count: counts.get(type) ?? 0,
  }))
}

/** Every state a parent message can be in (`migrations/0003_notifications.sql`). */
export const NOTIFICATION_STATUSES = [
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
] as const

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

/** The label of every parent message state. */
export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
}

/** The events a parent message is sent for (`crates/domain/src/leave.rs`). */
export const NOTIFICATION_EVENT_LABELS: Record<string, string> = {
  request_submitted: 'Request submitted',
  request_approved: 'Request approved',
  request_rejected: 'Request rejected',
  changes_requested: 'Changes requested',
}

/** The label of a parent message event, falling back to the raw code. */
export function notificationEventLabel(eventType: string): string {
  return NOTIFICATION_EVENT_LABELS[eventType] ?? eventType
}

/** The number of parent messages in every delivery state. */
export function countNotificationsByStatus(records: NotificationRecord[]): CountRow[] {
  const counts = new Map<string, number>()

  for (const record of records) {
    counts.set(record.status, (counts.get(record.status) ?? 0) + 1)
  }

  const rows: CountRow[] = NOTIFICATION_STATUSES.map((status) => ({
    key: status,
    label: NOTIFICATION_STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
  }))

  // A state the backend does not know yet is still counted, never dropped.
  for (const [status, count] of counts) {
    if (!NOTIFICATION_STATUSES.includes(status as NotificationStatus)) {
      rows.push({ key: status, label: status, count })
    }
  }

  return rows
}
