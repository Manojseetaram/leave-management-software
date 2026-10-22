import { describe, expect, it } from 'vitest'

import {
  NOTIFICATION_STATUSES,
  countByStatus,
  countByType,
  countNotificationsByStatus,
  notificationEventLabel,
  requestTypes,
} from './reports'

import type { NotificationRecord } from '../types/hod'
import type { LeaveRequest, RequestStatus, RequestType } from '../types/leave'

const request = (
  status: RequestStatus,
  requestType: RequestType,
  id: string,
): LeaveRequest => ({
  id,
  student_id: 'student-1',
  request_type: requestType,
  reason: 'A reason.',
  destination: null,
  start_at: '2026-10-01T00:00:00Z',
  end_at: '2026-10-02T00:00:00Z',
  status,
  submitted_at: null,
  decided_by: null,
  decided_at: null,
  decision_reason: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
})

const notification = (status: string, id: string): NotificationRecord => ({
  id,
  leave_request_id: 'request-1',
  event_type: 'request_approved',
  channel: 'sms',
  status,
  provider_message_id: null,
  attempt_count: 1,
  last_error: null,
  created_at: '2026-10-01T00:00:00Z',
  sent_at: null,
})

describe('report counts', () => {
  it('counts every workflow state, including the empty ones', () => {
    const rows = countByStatus([
      request('pending', 'personal_leave', 'a'),
      request('pending', 'medical_leave', 'b'),
      request('approved', 'personal_leave', 'c'),
    ])

    const pending = rows.find((row) => row.key === 'pending')
    const approved = rows.find((row) => row.key === 'approved')
    const rejected = rows.find((row) => row.key === 'rejected')

    expect(pending?.count).toBe(2)
    expect(approved?.count).toBe(1)
    expect(rejected?.count).toBe(0)
  })

  it('counts every request type', () => {
    const rows = countByType([
      request('pending', 'personal_leave', 'a'),
      request('pending', 'personal_leave', 'b'),
      request('approved', 'event_permission', 'c'),
    ])

    const personal = rows.find((row) => row.key === 'personal_leave')
    const event = rows.find((row) => row.key === 'event_permission')
    const other = rows.find((row) => row.key === 'other')

    expect(personal?.count).toBe(2)
    expect(event?.count).toBe(1)
    expect(other?.count).toBe(0)
  })

  it('knows every request type the backend accepts', () => {
    expect([...requestTypes()].sort()).toEqual([
      'event_permission',
      'medical_leave',
      'other',
      'personal_leave',
    ])
  })

  it('counts the parent messages in every delivery state', () => {
    const rows = countNotificationsByStatus([
      notification('queued', 'a'),
      notification('queued', 'b'),
      notification('sent', 'c'),
      notification('failed', 'd'),
    ])

    const queued = rows.find((row) => row.key === 'queued')
    const sent = rows.find((row) => row.key === 'sent')
    const failed = rows.find((row) => row.key === 'failed')

    expect(queued?.count).toBe(2)
    expect(sent?.count).toBe(1)
    expect(failed?.count).toBe(1)
  })

  it('keeps a delivery state it does not know instead of dropping it', () => {
    const rows = countNotificationsByStatus([notification('paused', 'a')])

    expect(rows.find((row) => row.key === 'paused')?.count).toBe(1)
  })

  it('labels the parent message events and falls back to the raw code', () => {
    expect(notificationEventLabel('request_approved')).toBe('Request approved')
    expect(notificationEventLabel('something_new')).toBe('something_new')
  })

  it('knows every delivery state the backend allows', () => {
    expect([...NOTIFICATION_STATUSES].sort()).toEqual([
      'delivered',
      'failed',
      'queued',
      'sending',
      'sent',
    ])
  })
})
