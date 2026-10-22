import { STUDENT_STATUS_LABELS } from '../../utils/student'

import type { FacultyStudentSummary } from '../../types/faculty'

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-status-approved-soft text-status-approved',
  inactive: 'bg-status-pending-soft text-status-pending',
  graduated: 'bg-status-completed-soft text-status-completed',
  archived: 'bg-status-withdrawn-soft text-status-withdrawn',
}

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
    <div className="app-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}

          <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Register number
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Department
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Semester
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Section
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Waiting for a decision
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Account
              </th>
              {onShowRequests && (
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {students.map((student) => (
              <tr key={student.id} className="transition-colors hover:bg-muted/60">
                <td className="px-4 py-3 font-medium text-foreground">
                  {student.register_number}
                </td>
                <td className="px-4 py-3 text-foreground">{student.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{student.department}</td>
                <td className="px-4 py-3 text-muted-foreground">{student.semester}</td>
                <td className="px-4 py-3 text-muted-foreground">{student.section ?? '—'}</td>
                <td className="px-4 py-3">
                  {student.pending_leave_count > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-status-pending-soft px-2.5 py-0.5 text-xs font-medium text-status-pending">
                      {student.pending_leave_count}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
                      STATUS_CLASSES[student.status] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {STUDENT_STATUS_LABELS[student.status] ?? student.status}
                  </span>
                </td>
                {onShowRequests && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onShowRequests(student)}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Show requests
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
