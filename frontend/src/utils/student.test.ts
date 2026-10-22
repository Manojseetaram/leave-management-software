import { describe, expect, it } from 'vitest'

import { STUDENT_STATUSES, STUDENT_STATUS_LABELS } from './student'

describe('student account states', () => {
  it('knows every state the backend allows', () => {
    expect([...STUDENT_STATUSES].sort()).toEqual([
      'active',
      'archived',
      'graduated',
      'inactive',
    ])
  })

  it('labels every state', () => {
    expect(Object.keys(STUDENT_STATUS_LABELS).sort()).toEqual(
      [...STUDENT_STATUSES].sort(),
    )
    expect(STUDENT_STATUS_LABELS.active).toBe('Active')
    expect(STUDENT_STATUS_LABELS.archived).toBe('Archived')
  })
})
