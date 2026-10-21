import { useState } from 'react'

import * as leaveApi from '../../api/leaveApi'

import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import LeaveRequestTable from '../../components/student/LeaveRequestTable'

import { useRequest } from '../../hooks/useRequest'

import { REQUEST_STATUS_LABELS, REQUEST_STATUSES } from '../../utils/leave'

import type { Paged } from '../../types/api'
import type { LeaveRequest, RequestStatus } from '../../types/leave'

const PER_PAGE = 10

export default function LeaveHistory() {
  const [status, setStatus] = useState<RequestStatus | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, error, isLoading, reload } = useRequest<Paged<LeaveRequest>>(
    `${status ?? 'all'}:${page}`,
    () => leaveApi.list({ status, page, per_page: PER_PAGE }),
  )

  const selectStatus = (next: RequestStatus | undefined) => {
    setStatus(next)
    setPage(1)
  }

  const requests = data?.items ?? []

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">My requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every leave request you have sent, and where it stands.
          </p>
        </div>

        <Button to="/student/apply">Apply for leave</Button>
      </header>

      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by status"
      >
        <FilterChip
          label="All"
          active={status === undefined}
          onClick={() => selectStatus(undefined)}
        />
        {REQUEST_STATUSES.map((value) => (
          <FilterChip
            key={value}
            label={REQUEST_STATUS_LABELS[value]}
            active={status === value}
            onClick={() => selectStatus(value)}
          />
        ))}
      </div>

      {isLoading ? (
        <LoadingState label="Loading your requests..." />
      ) : error ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : requests.length === 0 ? (
        <div className="app-card">
          <EmptyState
            title={status ? 'No requests with this status' : 'No requests yet'}
            description={
              status
                ? 'Try another status, or send a new request.'
                : 'Apply for leave and your requests will appear here.'
            }
            action={<Button to="/student/apply">Apply for leave</Button>}
          />
        </div>
      ) : (
        <>
          <LeaveRequestTable requests={requests} caption="Your leave requests" />

          {data && (
            <div className="app-card mt-4">
              <Pagination
                page={data.page}
                perPage={data.per_page}
                total={data.total}
                onPageChange={setPage}
                isLoading={isLoading}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}
