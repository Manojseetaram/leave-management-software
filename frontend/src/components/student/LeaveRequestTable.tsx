import { Link } from 'react-router-dom'

import Badge from '../common/Badge'

import { formatDate, formatDateRange } from '../../utils/format'
import { REQUEST_TYPE_LABELS } from '../../utils/leave'

import type { LeaveRequest } from '../../types/leave'

interface LeaveRequestTableProps {
  requests: LeaveRequest[]
  caption?: string
}

/** The list of leave requests, used by the dashboard and the history screen. */
export default function LeaveRequestTable({ requests, caption }: LeaveRequestTableProps) {
  return (
    <div className="app-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}

          <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
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
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {requests.map((request) => (
              <tr key={request.id} className="transition-colors hover:bg-muted/60">
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
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/student/requests/${request.id}`}
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
