import { useState } from 'react'

import * as leaveApi from '../../api/leaveApi'

import Button from '../../components/common/Button'
import FilterChip from '../../components/common/FilterChip'
import LeaveRequestTable from '../../components/common/LeaveRequestTable'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { useStudentDirectory } from '../../hooks/useStudentDirectory'
import { useRequest } from '../../hooks/useRequest'

import { REQUEST_STATUS_LABELS, REQUEST_STATUSES } from '../../utils/leave'

import type { Paged } from '../../types/api'
import type { LeaveRequest, RequestStatus } from '../../types/leave'

const PER_PAGE = 20

/**
 * The HOD opens on the requests that are waiting for a decision. Every
 * request in the list is theirs to act on, so the queue is the starting
 * point rather than a summary of everything.
 */
const DEFAULT_STATUS: RequestStatus = 'pending'

export default function LeaveRequests() {
  const [status, setStatus] = useState<RequestStatus | undefined>(DEFAULT_STATUS)
  const [page, setPage] = useState(1)

  // The leave request carries a student id but no name, so the roster is
  // read alongside the list to put a name on every row.
  const directory = useStudentDirectory()

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
          <h1 className="text-page-title">Leave requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every leave request you can review, and where it stands.
          </p>
        </div>

        <Button variant="secondary" to="/hod/students">
          Student roster
        </Button>
      </header>

      <div
        role="group"
        aria-label="Filter requests by status"
        className="mb-5 flex flex-wrap gap-2"
      >
        <FilterChip
          label={REQUEST_STATUS_LABELS[DEFAULT_STATUS]}
          active={status === DEFAULT_STATUS}
          onClick={() => selectStatus(DEFAULT_STATUS)}
        />

        <FilterChip
          label="All"
          active={status === undefined}
          onClick={() => selectStatus(undefined)}
        />

        {REQUEST_STATUSES.filter((value) => value !== DEFAULT_STATUS).map((value) => (
          <FilterChip
            key={value}
            label={REQUEST_STATUS_LABELS[value]}
            active={status === value}
            onClick={() => selectStatus(value)}
          />
        ))}
      </div>

      {isLoading ? (
        <LoadingState label="Loading the requests..." />
      ) : error ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : requests.length === 0 ? (
        <div className="app-card">
          <EmptyState
            title={
              status === DEFAULT_STATUS
                ? 'Nothing is waiting for a decision'
                : status
                  ? 'No requests with this status'
                  : 'No requests yet'
            }
            description={
              status === DEFAULT_STATUS
                ? 'Every request has been reviewed. New submissions show up here.'
                : status
                  ? 'Try another status to find the requests you are looking for.'
                  : 'No leave request has been submitted yet.'
            }
            action={
              status === DEFAULT_STATUS ? (
                <Button variant="secondary" onClick={() => selectStatus(undefined)}>
                  Show all requests
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => selectStatus(DEFAULT_STATUS)}>
                  Show pending requests
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          {directory.error && (
            <p
              role="alert"
              className="app-card mb-4 border-destructive/40 p-3 text-sm text-destructive"
            >
              The student names could not be loaded, so some rows show an id instead.
            </p>
          )}

          <LeaveRequestTable
            requests={requests}
            caption="Leave requests to review"
            linkBase="/hod/requests"
            student={(request) =>
              directory.isLoading ? undefined : directory.label(request.student_id)
            }
          />

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
