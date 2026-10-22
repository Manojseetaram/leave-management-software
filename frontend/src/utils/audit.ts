/**
 * Audit log labels.
 *
 * The backend writes one audit row per action it performs. The codes come
 * from `crates/service/src/{auth,leave,parents,students,users}.rs` and the
 * entity types from the same calls, so the labels below are the readable
 * form of what the server actually stores.
 */

/** The label shown for every audit action the backend writes. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.change_password': 'Changed their password',
  'auth.revoke_session': 'Revoked a session',
  'auth.reset_password': 'Reset a password',
  'leave.create': 'Created a leave request',
  'leave.update': 'Edited a leave request',
  'leave.pending': 'Submitted a leave request',
  'leave.approved': 'Approved a leave request',
  'leave.rejected': 'Rejected a leave request',
  'leave.changes_requested': 'Asked for changes on a leave request',
  'leave.withdrawn': 'Withdrew a leave request',
  'leave.completed': 'Completed a leave request',
  'student.create': 'Created a student account',
  'student.update': 'Updated a student record',
  'student.deactivate': 'Archived a student account',
  'student.restore': 'Restored a student account',
  'student.reset_password': 'Reset a student password',
  'parent.create': 'Added a parent contact',
  'parent.verify': 'Verified a parent contact',
  'user.create': 'Created a staff account',
  'user.bootstrap_admin': 'Bootstrapped the admin account',
}

/** The label shown for every entity an audit entry can point at. */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  leave_request: 'Leave request',
  student: 'Student',
  parent: 'Parent contact',
  session: 'Session',
  user: 'User account',
}

/** The label of an audit action. An unknown code is shown as it is. */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

/** The label of an audit entity type. An unknown code is shown as it is. */
export function auditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType
}
