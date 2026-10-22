import { Link } from 'react-router-dom'

import Badge from './Badge'

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
}

/** The list of leave requests, shared by the dashboards and the request lists. */
export default function LeaveRequestTable({
  requests,
  caption,
  linkBase = '/student/requests',
  student,
}: LeaveRequestTableProps) {
  return (
    <div className="app-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}

          <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              {student && (
                <th scope="col" className="px-4 py-3 font-medium">
                  Student
                </th>
              )}
              <th scope="col" className="px-4 py-3 font-medium">
                Type
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Dates
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Submitted
              </th>
              {linkBase !== null && (
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((request) => (
              <tr key={request.id} className="transition-colors hover:bg-muted/60">
                {student && (
                  <td className="px-4 py-3 font-medium text-foreground">
                    {student(request) ?? '—'}
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-foreground">
                  {REQUEST_TYPE_LABELS[request.request_type]}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDateRange(request.start_at, request.end_at)}
                </td>
                <td className="px-4 py-3">
                  <Badge status={request.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDate(request.submitted_at)}
                </td>
                {linkBase !== null && (
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`${linkBase}/${request.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      View
                    </Link>
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
