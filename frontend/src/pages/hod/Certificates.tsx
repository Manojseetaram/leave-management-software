import { useState } from 'react'
import { Award } from 'lucide-react'

import * as leaveApi from '../../api/leaveApi'

import FilterChip from '../../components/common/FilterChip'
import LeaveRequestTable from '../../components/common/LeaveRequestTable'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { useRequest } from '../../hooks/useRequest'
import { useStudentDirectory } from '../../hooks/useStudentDirectory'

import { REQUEST_STATUS_LABELS } from '../../utils/leave'

import type { Paged } from '../../types/api'
import type { LeaveRequest, RequestStatus } from '../../types/leave'

const PER_PAGE = 20

/**
 * The states a leave can be certified for.
 *
 * A certificate is the record that a leave was granted, so the request has
 * to be `approved` — the leave is granted and running — or `completed`, the
 * leave has ended.
 */
const CERTIFIABLE_STATUSES: RequestStatus[] = ['approved', 'completed']

/**
 * The leaves a certificate can be issued from.
 *
 * The backend has no certificate endpoint, so nothing can be generated or
 * downloaded yet. The list is the record a certificate would be based on:
 * the leave requests the HOD has approved.
 */
export default function Certificates() {
  const [status, setStatus] = useState<RequestStatus>('approved')
  const [page, setPage] = useState(1)

  // The leave request carries a student id but no name, so the roster is
  // read alongside the list to put a name on every row.
  const directory = useStudentDirectory()

  const { data, error, isLoading, reload } = useRequest<Paged<LeaveRequest>>(
    `${status}:${page}`,
    () => leaveApi.list({ status, page, per_page: PER_PAGE }),
  )

  const selectStatus = (next: RequestStatus) => {
    setStatus(next)
    setPage(1)
  }

  const requests = data?.items ?? []

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Certificates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The leave requests a certificate can be issued from.
          </p>
        </div>
      </header>

      <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <Award
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <div>
            <p className="text-sm font-medium text-foreground">Issuing a certificate</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Not available yet. The backend has no certificate or document endpoint,
              so a certificate cannot be generated, downloaded or signed here. The list
              below is the record a certificate would be based on, and every request
              keeps the decision that was made on it.
            </p>
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter the certificates by leave state"
        className="mt-6 flex flex-wrap gap-2"
      >
        {CERTIFIABLE_STATUSES.map((value) => (
          <FilterChip
            key={value}
            label={REQUEST_STATUS_LABELS[value]}
            active={status === value}
            onClick={() => selectStatus(value)}
          />
        ))}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <LoadingState label="Loading the certificates..." />
        ) : error ? (
          <div className="app-card">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : requests.length === 0 ? (
          <div className="app-card">
            <EmptyState
              title={
                status === 'approved'
                  ? 'No approved leave yet'
                  : 'No completed leave yet'
              }
              description={
                status === 'approved'
                  ? 'A leave appears here once it has been approved.'
                  : 'A leave appears here once it has ended and the student marked it as completed.'
              }
            />
          </div>
        ) : (
          <>
            <LeaveRequestTable
              requests={requests}
              caption="Leave requests a certificate can be issued from"
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
    </div>
  )
}
