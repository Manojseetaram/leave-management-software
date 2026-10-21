import { describe, expect, it } from 'vitest'

import {
  MAX_DESTINATION_LENGTH,
  MAX_LEAVE_SPAN_DAYS,
  MAX_REASON_LENGTH,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUSES,
  REQUEST_TYPE_LABELS,
  canComplete,
  canSubmit,
  canWithdraw,
  isEditable,
} from './leave'

import type { RequestStatus } from '../types/leave'

/**
 * The backend is the authority on the workflow. These tests pin the frontend
 * helpers to the state machine in `crates/domain/src/leave.rs`, so the UI can
 * only ever offer an action the server will accept.
 */
describe('leave workflow helpers', () => {
  const ALL_STATUSES: RequestStatus[] = [
    'draft',
    'pending',
    'changes_requested',
    'approved',
    'rejected',
    'withdrawn',
    'completed',
  ]

  it('knows every status the backend defines', () => {
    expect([...REQUEST_STATUSES].sort()).toEqual([...ALL_STATUSES].sort())
    expect(Object.keys(REQUEST_STATUS_LABELS).sort()).toEqual([...ALL_STATUSES].sort())
  })

  it('labels every leave type', () => {
    expect(Object.keys(REQUEST_TYPE_LABELS).sort()).toEqual([
      'event_permission',
      'medical_leave',
      'other',
      'personal_leave',
    ])
  })

  it('mirrors RequestStatus::is_editable', () => {
    const editable: RequestStatus[] = ['draft', 'changes_requested']
    for (const status of ALL_STATUSES) {
      expect(isEditable(status)).toBe(editable.includes(status))
    }
  })

  it('mirrors next_status(status, Submit)', () => {
    const allowed: RequestStatus[] = ['draft', 'changes_requested']
    for (const status of ALL_STATUSES) {
      expect(canSubmit(status)).toBe(allowed.includes(status))
    }
  })

  it('mirrors next_status(status, Withdraw)', () => {
    const allowed: RequestStatus[] = ['draft', 'pending', 'changes_requested']
    for (const status of ALL_STATUSES) {
      expect(canWithdraw(status)).toBe(allowed.includes(status))
    }
  })

  it('mirrors next_status(status, Complete)', () => {
    const allowed: RequestStatus[] = ['approved']
    for (const status of ALL_STATUSES) {
      expect(canComplete(status)).toBe(allowed.includes(status))
    }
  })

  it('never offers an action on a terminal status', () => {
    for (const status of ['rejected', 'withdrawn', 'completed'] as RequestStatus[]) {
      expect(canSubmit(status)).toBe(false)
      expect(canWithdraw(status)).toBe(false)
      expect(canComplete(status)).toBe(false)
      expect(isEditable(status)).toBe(false)
    }
  })

  it('never lets an approved request be edited or resubmitted', () => {
    expect(isEditable('approved')).toBe(false)
    expect(canSubmit('approved')).toBe(false)
    expect(canWithdraw('approved')).toBe(false)
  })
})

describe('validation limits', () => {
  it('matches the limits in validate_leave', () => {
    expect(MAX_REASON_LENGTH).toBe(2000)
    expect(MAX_DESTINATION_LENGTH).toBe(200)
    expect(MAX_LEAVE_SPAN_DAYS).toBe(365)
  })
})
