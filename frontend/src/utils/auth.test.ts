import { describe, expect, it } from 'vitest'

import { roleLabel, roleLabels } from './auth'

import type { Role } from '../types/auth'

describe('role labels', () => {
  it('labels every role the backend defines', () => {
    const roles: Role[] = ['admin', 'hod', 'faculty', 'student']

    expect(roles.map(roleLabel)).toEqual(['Admin', 'HOD', 'Faculty', 'Student'])
  })

  it('writes HOD the way the department writes it', () => {
    expect(roleLabel('hod')).toBe('HOD')
  })

  it('keeps the order of the roles it was given', () => {
    expect(roleLabels(['faculty', 'student'])).toBe('Faculty, Student')
    expect(roleLabels([])).toBe('')
  })
})
