import { describe, expect, it } from 'vitest'

import { ApiError } from '../api/client'

import {
  FACULTY_SEMESTERS,
  isEndpointUnavailable,
  semesterLabel,
} from './faculty'

describe('faculty helpers', () => {
  it('treats a missing route as an unavailable endpoint', () => {
    expect(isEndpointUnavailable(new ApiError(404, 'not_found', 'not found'))).toBe(true)
  })

  it('treats a forbidden route as an unavailable endpoint', () => {
    expect(isEndpointUnavailable(new ApiError(403, 'forbidden', 'forbidden'))).toBe(true)
  })

  it('does not hide a real failure behind the unavailable notice', () => {
    expect(isEndpointUnavailable(new ApiError(500, 'internal_error', 'boom'))).toBe(false)
    expect(isEndpointUnavailable(new ApiError(422, 'validation_error', 'bad'))).toBe(false)
    expect(isEndpointUnavailable(new Error('network'))).toBe(false)
    expect(isEndpointUnavailable(null)).toBe(false)
  })

  it('knows the semesters the department teaches', () => {
    expect(FACULTY_SEMESTERS).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('labels a semester filter value', () => {
    expect(semesterLabel(5)).toBe('Semester 5')
  })
})
