import { useSearchParams } from 'react-router-dom'

import * as leaveApi from '../../api/leaveApi'

import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import LeaveRequestTable from '../../components/student/LeaveRequestTable'

import { useRequest } from '../../hooks/useRequest'

import { REQUEST_STATUS_LABELS, REQUEST_STATUSES } from '../../utils/leave'

import type { Paged } from '../../types/api'
import type { LeaveListParams, LeaveRequest, RequestStatus } from '../../types/leave'

const PER_PAGE = 10

export default function LeaveRequests() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status: RequestStatus | undefined = REQUEST_STATUSES.includes(
    statusParam as RequestStatus,
  )
    ? (statusParam as RequestStatus)
    : undefined

  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
  const { data, error, isLoading, reload } = useRequest<Paged<LeaveRequest>>(
    `hod-leave:${status ?? 'all'}:${page}`,
    () =>
      leaveApi.list({
        status,
        page,
        per_page: PER_PAGE,
      } satisfies LeaveListParams),
  )

  const setStatus = (next: RequestStatus | undefined) => {
    const nextParams = new URLSearchParams(searchParams)
    if (next) nextParams.set('status', next)
    else nextParams.delete('status')
    nextParams.set('page', '1')
    setSearchParams(nextParams, { replace: true })
  }

  const setPageNumber = (next: number) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(next))
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Leave requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, decide, request changes or close approved requests.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Status</span>
          <select
            value={status ?? ''}
            onChange={(event) => setStatus(event.target.value as RequestStatus | undefined)}
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
        <LoadingState label="Loading leave requests..." />
      ) : error ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="app-card">
          <EmptyState
            title="No requests found"
            description="Try a different status filter, or wait for new student submissions."
          />
        </div>
      ) : (
        <>
          <LeaveRequestTable requests={data.items} caption="Leave requests" />

          <div className="app-card">
            <Pagination
              page={page}
              perPage={PER_PAGE}
              total={data.total}
              onPageChange={setPageNumber}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  )
}
