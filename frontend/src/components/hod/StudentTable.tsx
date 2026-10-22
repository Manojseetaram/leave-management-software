import { Link } from 'react-router-dom'

import { STUDENT_STATUS_LABELS } from '../../utils/student'

import type { StudentFilterStatus, StudentRecord } from '../../types/student'

const STATUS_CLASSES: Record<StudentFilterStatus, string> = {
  active: 'bg-status-approved-soft text-status-approved',
  inactive: 'bg-status-pending-soft text-status-pending',
  graduated: 'bg-status-completed-soft text-status-completed',
  archived: 'bg-status-withdrawn-soft text-status-withdrawn',
}

interface StudentTableProps {
  students: StudentRecord[]
  caption?: string
}

/** The student roster. */
export default function StudentTable({ students, caption }: StudentTableProps) {
  return (
    <div className="app-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
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
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
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
                <td className="px-4 py-3 text-muted-foreground">{student.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
                      STATUS_CLASSES[student.status] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {STUDENT_STATUS_LABELS[student.status] ?? student.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/hod/students/${student.id}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
