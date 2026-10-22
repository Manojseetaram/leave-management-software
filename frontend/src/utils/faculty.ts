/**
 * Faculty helpers.
 *
 * The Faculty console is read-only and the backend gives a faculty member no
 * Faculty-scoped read endpoint yet — it holds only `students:read`, which no
 * handler honours. The contract the backend has to provide is written down
 * in docs/faculty-api-contract.md, and the screens fall back to an honest
 * notice while the routes are missing.
 */

import { ApiError } from '../api/client'

/** The semesters the department teaches. */
export const FACULTY_SEMESTERS: number[] = [1, 2, 3, 4, 5, 6, 7, 8]

/**
 * True when the backend cannot serve a Faculty route yet.
 *
 * A missing route answers 404 and a route the role may not use answers 403.
 * Both mean the same thing to the screen: the data is not readable, so it
 * says so instead of showing an empty table.
 */
export function isEndpointUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404)
}

/** The label of a semester filter value. */
export function semesterLabel(semester: number): string {
  return `Semester ${semester}`
}
