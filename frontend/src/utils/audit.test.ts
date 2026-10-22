import { describe, expect, it } from 'vitest'

import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  auditActionLabel,
  auditEntityLabel,
} from './audit'

describe('audit log labels', () => {
  it('labels every leave transition the state machine allows', () => {
    for (const status of [
      'pending',
      'approved',
      'rejected',
      'changes_requested',
      'withdrawn',
      'completed',
    ]) {
      expect(AUDIT_ACTION_LABELS[`leave.${status}`]).toBeDefined()
    }
  })

  it('falls back to the raw code for an action it does not know', () => {
    expect(auditActionLabel('leave.draft')).toBe('leave.draft')
    expect(auditActionLabel('student.create')).toBe('Created a student account')
  })

  it('labels the entity an audit entry points at', () => {
    expect(auditEntityLabel('leave_request')).toBe('Leave request')
    expect(auditEntityLabel('student')).toBe('Student')
    expect(auditEntityLabel('parent')).toBe('Parent contact')
  })

  it('falls back to the raw code for an entity it does not know', () => {
    expect(auditEntityLabel('event')).toBe('event')
  })

  it('knows an entity label for every entity the backend writes', () => {
    for (const entity of ['leave_request', 'student', 'parent', 'session', 'user']) {
      expect(AUDIT_ENTITY_LABELS[entity]).toBeDefined()
    }
  })
})
