/**
 * Student account rules.
 *
 * The backend constrains the account state to four values
 * (`crates/migrations/0001_init.sql`) and hides the archived students from
 * the list unless they are asked for.
 */

import type { StudentFilterStatus } from '../types/student'

/** Every account state a student record can be in. */
export const STUDENT_STATUSES: StudentFilterStatus[] = [
  'active',
  'inactive',
  'graduated',
  'archived',
]

/** The label shown for every account state. */
export const STUDENT_STATUS_LABELS: Record<StudentFilterStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  graduated: 'Graduated',
  archived: 'Archived',
}
