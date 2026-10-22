import { useState } from 'react'
import { CalendarPlus, FilterX } from 'lucide-react'

import * as leaveApi from '../../api/leaveApi'

import Button from '../../components/common/Button'
import FilterChip from '../../components/common/FilterChip'
import LeaveRequestTable from '../../components/common/LeaveRequestTable'
import PageHeader from '../../components/common/PageHeader'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

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
      <PageHeader
        title="My requests"
        description="Every leave request you have sent, and where it stands."
        actions={
          <Button to="/student/apply">
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Apply for leave
          </Button>
        }
      />

      <section className="app-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="-mx-1 flex flex-wrap gap-2 px-1"
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

          {status && (
            <Button variant="ghost" size="sm" onClick={() => selectStatus(undefined)}>
              <FilterX className="h-4 w-4" aria-hidden="true" />
              Clear filter
            </Button>
          )}
        </div>
      </section>

      <div className="mt-5">
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
              action={
                <Button to="/student/apply">
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Apply for leave
                </Button>
              }
            />
          </div>
        ) : (
          <LeaveRequestTable
            requests={requests}
            caption="Your leave requests"
            footer={
              data ? (
                <Pagination
                  page={data.page}
                  perPage={data.per_page}
                  total={data.total}
                  onPageChange={setPage}
                  isLoading={isLoading}
                />
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  )
}
