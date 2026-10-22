import StatusBadge from '../common/StatusBadge'
import TableShell from '../common/TableShell'

import { STUDENT_STATUS_TONES } from '../../utils/status'
import { STUDENT_STATUS_LABELS } from '../../utils/student'

import type { FacultyStudentSummary } from '../../types/faculty'

interface FacultyStudentTableProps {
  students: FacultyStudentSummary[]
  caption?: string
  /**
   * Called when the reader wants the leave requests of one student. The
   * Faculty contract has no per-student route, so the requests screen is
   * where a student is opened.
   */
  onShowRequests?: (student: FacultyStudentSummary) => void
}

/**
 * The Faculty roster.
 *
 * Read-only: the contract the backend has to provide has no write path for
 * a faculty member, so the table only shows what the roster holds.
 */
export default function FacultyStudentTable({
  students,
  caption,
  onShowRequests,
}: FacultyStudentTableProps) {
  return (
    <TableShell caption={caption} minWidth="52rem">
      <thead>
        <tr>
          <th scope="col">Register number</th>
          <th scope="col">Name</th>
          <th scope="col">Department</th>
          <th scope="col">Semester</th>
          <th scope="col">Section</th>
          <th scope="col">Waiting for a decision</th>
          <th scope="col">Account</th>
          {onShowRequests && (
            <th scope="col" className="text-right">
              <span className="sr-only">Actions</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {students.map((student) => (
          <tr key={student.id}>
            <td className="app-numeric font-medium text-foreground">
              {student.register_number}
            </td>
            <td className="font-medium text-foreground">{student.full_name}</td>
            <td className="text-muted-foreground">{student.department}</td>
            <td className="app-numeric text-muted-foreground">{student.semester}</td>
            <td className="text-muted-foreground">{student.section ?? '—'}</td>
            <td className="app-numeric">
              {student.pending_leave_count > 0 ? (
                <span className="inline-flex items-center rounded-full bg-status-pending-soft px-2.5 py-0.5 text-xs font-medium text-status-pending">
                  {student.pending_leave_count}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td>
              <StatusBadge tone={STUDENT_STATUS_TONES[student.status]}>
                {STUDENT_STATUS_LABELS[student.status] ?? student.status}
              </StatusBadge>
            </td>
            {onShowRequests && (
              <td className="text-right">
                <button
                  type="button"
                  onClick={() => onShowRequests(student)}
                  className="app-link text-sm focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Show requests
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </TableShell>
  )
}
