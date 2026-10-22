import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import Badge from './Badge'
import TableShell from './TableShell'

import { formatDate, formatDateRange } from '../../utils/format'
import { REQUEST_TYPE_LABELS } from '../../utils/leave'

import type { LeaveRequest } from '../../types/leave'

interface LeaveRequestTableProps {
  requests: LeaveRequest[]
  caption?: string
  /**
   * The path each row links to, without the request id. The Student console
   * links to its own history, the HOD console to its review queue. `null`
   * leaves the link out, for a console that has no request detail page.
   */
  linkBase?: string | null
  /**
   * Renders the student the request belongs to. Staff see requests from
   * several students, so they need the name next to the row. When it is
   * absent the column is left out entirely.
   */
  student?: (request: LeaveRequest) => string | undefined
  /** Shown under the table, inside the same card. */
  footer?: ReactNode
}

/** The list of leave requests, shared by the dashboards and the request lists. */
export default function LeaveRequestTable({
  requests,
  caption,
  linkBase = '/student/requests',
  student,
  footer,
}: LeaveRequestTableProps) {
  return (
    <TableShell caption={caption} minWidth="45rem" footer={footer}>
      <thead>
        <tr>
          {student && <th scope="col">Student</th>}
          <th scope="col">Type</th>
          <th scope="col">Dates</th>
          <th scope="col">Status</th>
          <th scope="col">Submitted</th>
          {linkBase !== null && (
            <th scope="col" className="text-right">
              <span className="sr-only">Actions</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {requests.map((request) => (
          <tr key={request.id}>
            {student && (
              <td className="font-medium text-foreground">
                {student(request) ?? '—'}
              </td>
            )}
            <td className="font-medium text-foreground">
              {REQUEST_TYPE_LABELS[request.request_type]}
            </td>
            <td className="app-numeric whitespace-nowrap text-muted-foreground">
              {formatDateRange(request.start_at, request.end_at)}
            </td>
            <td>
              <Badge status={request.status} />
            </td>
            <td className="app-numeric whitespace-nowrap text-muted-foreground">
              {formatDate(request.submitted_at)}
            </td>
            {linkBase !== null && (
              <td className="text-right">
                <Link
                  to={`${linkBase}/${request.id}`}
                  className="app-link text-sm focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  View
                </Link>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </TableShell>
  )
}
