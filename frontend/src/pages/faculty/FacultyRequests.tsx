import { useState } from 'react'
import { useRequest } from '../../hooks/useRequest'
import * as facultyApi from '../../api/facultyApi'
import Badge from '../../components/common/Badge'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import { REQUEST_STATUS_LABELS, REQUEST_STATUSES } from '../../utils/leave'
import { formatDateRange, formatDateTime } from '../../utils/format'

import type { FacultyLeaveRequest } from '../../types/faculty'
import type { RequestStatus } from '../../types/leave'

const PER_PAGE = 10

export default function FacultyRequests() {
  const [status, setStatus] = useState<RequestStatus | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, error, isLoading, reload } = useRequest(
    `faculty:requests:${status ?? 'all'}:${page}`,
    () =>
      facultyApi.leaveRequests({
        status,
        page,
        per_page: PER_PAGE,
      }),
  )

  const items = (data?.items ?? []) as FacultyLeaveRequest[]
  const total = data?.total ?? 0

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Student requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Leave requests visible through the faculty permission.</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Status</span>
          <select
            value={status ?? ''}
            onChange={(event) => {
              setStatus(event.target.value as RequestStatus | undefined)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All</option>
            {REQUEST_STATUSES.map((option) => (
              <option key={option} value={option}>
                {REQUEST_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </header>

      {isLoading ? (
        <LoadingState label="Loading student requests..." />
      ) : error ? (
        <div className="app-card"><ErrorState message={error} onRetry={reload} /></div>
      ) : items.length === 0 ? (
        <div className="app-card"><EmptyState title="No requests found" /></div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{request.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{request.request_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateRange(request.start_at, request.end_at)}</td>
                    <td className="px-4 py-3"><Badge status={request.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(request.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3">
            <Pagination page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  )
}
