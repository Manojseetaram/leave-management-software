import { Link } from 'react-router-dom'

import StatusBadge from '../common/StatusBadge'
import TableShell from '../common/TableShell'

import { STUDENT_STATUS_TONES } from '../../utils/status'
import { STUDENT_STATUS_LABELS } from '../../utils/student'

import type { StudentRecord } from '../../types/student'

interface StudentTableProps {
  students: StudentRecord[]
  caption?: string
}

/** The student roster. */
export default function StudentTable({ students, caption }: StudentTableProps) {
  return (
    <TableShell caption={caption} minWidth="55rem">
      <thead>
        <tr>
          <th scope="col">Register number</th>
          <th scope="col">Name</th>
          <th scope="col">Department</th>
          <th scope="col">Semester</th>
          <th scope="col">Section</th>
          <th scope="col">Email</th>
          <th scope="col">Status</th>
          <th scope="col" className="text-right">
            <span className="sr-only">Actions</span>
          </th>
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
            <td className="text-muted-foreground">{student.email ?? '—'}</td>
            <td>
              <StatusBadge tone={STUDENT_STATUS_TONES[student.status]}>
                {STUDENT_STATUS_LABELS[student.status] ?? student.status}
              </StatusBadge>
            </td>
            <td className="text-right">
              <Link
                to={`/hod/students/${student.id}`}
                className="app-link text-sm focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  )
}
