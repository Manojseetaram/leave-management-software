import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import * as leaveApi from '../../api/leaveApi'
import * as studentApi from '../../api/studentApi'

import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Field from '../../components/common/Field'
import { ErrorState, LoadingState } from '../../components/common/States'
import DecisionPanel from '../../components/hod/DecisionPanel'

import { useRequest } from '../../hooks/useRequest'

import { daysBetween, formatDateTime } from '../../utils/format'
import { REQUEST_TYPE_LABELS } from '../../utils/leave'

import type { HistoryEntry, LeaveRequest } from '../../types/leave'
import type { StudentRecord } from '../../types/student'

interface DetailsData {
  request: LeaveRequest
  entries: HistoryEntry[]
  /** The student the request belongs to, when the record could be read. */
  student: StudentRecord | null
}

export default function LeaveDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, error, isLoading, reload } = useRequest<DetailsData | null>(
    id ?? 'unknown',
    async () => {
      if (!id) return null

      const request = await leaveApi.show(id)

      const [history, student] = await Promise.all([
        leaveApi.history(id),
        // The student record is the context for the decision, not the
        // decision itself: a failure here must not hide the request.
        studentApi.show(request.student_id).catch(() => null),
      ])

      return { request, entries: history.items, student }
    },
  )

  if (isLoading) {
    return (
      <div className="app-page">
        <LoadingState label="Loading the request..." />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="app-page">
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>

        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/hod/requests')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to the requests
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { request, entries, student } = data
  const duration = daysBetween(request.start_at, request.end_at)

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <button
            type="button"
            onClick={() => navigate('/hod/requests')}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to the requests
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-page-title">{REQUEST_TYPE_LABELS[request.request_type]}</h1>
            <Badge status={request.status} />
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {student ? (
              <>
                Requested by {student.full_name} ({student.register_number}) ·{' '}
              </>
            ) : null}
            {formatDateTime(request.created_at)}
          </p>
        </div>

        <DecisionPanel request={request} onDecided={reload} />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="app-card p-5 md:p-6">
            <h2 className="text-section-title">Request details</h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="From">{formatDateTime(request.start_at)}</Field>
              <Field label="To">{formatDateTime(request.end_at)}</Field>
              <Field label="Duration">
                {duration} day{duration === 1 ? '' : 's'}
              </Field>
              <Field label="Submitted">{formatDateTime(request.submitted_at)}</Field>
              <Field label="Destination">{request.destination || '—'}</Field>
              <Field label="Last updated">{formatDateTime(request.updated_at)}</Field>
            </dl>

            <div className="mt-5 border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-foreground">Reason</h3>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-muted-foreground">
                {request.reason}
              </p>
            </div>

            {request.decision_reason && (
              <div className="mt-5 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground">Decision</h3>
                <p className="mt-1.5 text-sm whitespace-pre-wrap text-muted-foreground">
                  {request.decision_reason}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Decided {formatDateTime(request.decided_at)}
                </p>
              </div>
            )}
          </section>

          <section className="app-card p-5 md:p-6">
            <h2 className="text-section-title">History</h2>

            {entries.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing has happened to this request yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {entry.old_status
                          ? `${entry.old_status.replaceAll('_', ' ')} → ${entry.new_status.replaceAll('_', ' ')}`
                          : `Created as ${entry.new_status.replaceAll('_', ' ')}`}
                      </p>
                      {entry.comment && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {entry.comment}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(entry.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="app-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Student</h2>

            {student ? (
              <>
                <p className="mt-2 text-sm font-medium text-foreground">{student.full_name}</p>
                <p className="text-xs text-muted-foreground">{student.register_number}</p>

                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Department</dt>
                    <dd className="text-foreground">{student.department}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Semester</dt>
                    <dd className="text-foreground">
                      {student.semester}
                      {student.section ? ` · ${student.section}` : ''}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="truncate text-foreground">{student.email ?? '—'}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                The student record could not be loaded.
              </p>
            )}
          </div>

          <div className="app-card p-4">
            <h2 className="text-sm font-semibold text-foreground">What happens next</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {request.status === 'pending' &&
                'This request is waiting for your decision. Approve it, reject it, or ask the student for changes.'}
              {request.status === 'changes_requested' &&
                'You asked the student for changes. The request comes back to you when they send it again.'}
              {request.status === 'approved' &&
                'You approved this request. The student marks it as completed once the leave has ended.'}
              {request.status === 'completed' &&
                'This request is closed. The history above shows everything that happened.'}
              {request.status === 'rejected' &&
                'You rejected this request. The student can send a new one if the situation changes.'}
              {request.status === 'withdrawn' &&
                'The student withdrew this request. There is nothing left to decide.'}
              {request.status === 'draft' &&
                'The student has not sent this request yet, so there is nothing to decide.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
