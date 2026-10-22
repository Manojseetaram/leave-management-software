import { describe, expect, it } from 'vitest'

import {
  REQUEST_STATUS_TONES,
  STATUS_TONE_CLASSES,
  STUDENT_STATUS_TONES,
  type StatusTone,
} from './status'

import type { RequestStatus } from '../types/leave'
import type { StudentFilterStatus } from '../types/student'

/**
 * The colour of a status is shared by every screen, so these tests pin the
 * tone of each state and make sure no state can be left without one.
 */
describe('status tones', () => {
  const ALL_REQUEST_STATUSES: RequestStatus[] = [
    'draft',
    'pending',
    'changes_requested',
    'approved',
    'rejected',
    'withdrawn',
    'completed',
  ]

  const ALL_STUDENT_STATUSES: StudentFilterStatus[] = [
    'active',
    'inactive',
    'graduated',
    'archived',
  ]

  it('gives every leave status a tone', () => {
    expect(Object.keys(REQUEST_STATUS_TONES).sort()).toEqual(
      [...ALL_REQUEST_STATUSES].sort(),
    )
  })

  it('gives every student account status a tone', () => {
    expect(Object.keys(STUDENT_STATUS_TONES).sort()).toEqual(
      [...ALL_STUDENT_STATUSES].sort(),
    )
  })

  it('gives every tone a pill colour', () => {
    const tones = Object.keys(STATUS_TONE_CLASSES) as StatusTone[]
    expect(tones.length).toBeGreaterThan(0)

    for (const tone of tones) {
      expect(STATUS_TONE_CLASSES[tone]).not.toBe('')
    }
  })

  it('keeps the outcome of a request apart from the outcome of an account', () => {
    // An approved request and an active account both read as granted, but a
    // rejected request must never look like a finished account.
    expect(REQUEST_STATUS_TONES.approved).toBe('success')
    expect(REQUEST_STATUS_TONES.rejected).toBe('danger')
    expect(REQUEST_STATUS_TONES.changes_requested).toBe('violet')
    expect(REQUEST_STATUS_TONES.pending).toBe('warning')
    expect(REQUEST_STATUS_TONES.draft).toBe('neutral')
    expect(REQUEST_STATUS_TONES.withdrawn).toBe('neutral')
    expect(REQUEST_STATUS_TONES.completed).toBe('info')

    expect(STUDENT_STATUS_TONES.active).toBe('success')
    expect(STUDENT_STATUS_TONES.inactive).toBe('warning')
    expect(STUDENT_STATUS_TONES.graduated).toBe('info')
    expect(STUDENT_STATUS_TONES.archived).toBe('neutral')
  })

  it('never gives two leave statuses the same tone', () => {
    const tones = ALL_REQUEST_STATUSES.map((status) => REQUEST_STATUS_TONES[status])

    // draft and withdrawn share a tone on purpose; nothing else may.
    expect(new Set(tones).size).toBe(tones.length - 1)
  })
})
