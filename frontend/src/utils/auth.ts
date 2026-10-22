/**
 * Role labels.
 *
 * The backend names the roles in lower case, but the interface shows them as
 * the department writes them: HOD, not Hod.
 */

import type { Role } from '../types/auth'

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  hod: 'HOD',
  faculty: 'Faculty',
  student: 'Student',
}

/** The label of one role. */
export function roleLabel(role: Role): string {
  return ROLE_LABELS[role]
}

/** The labels of several roles, in the order they were given. */
export function roleLabels(roles: Role[]): string {
  return roles.map(roleLabel).join(', ')
}
