import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Pencil, Send, Undo2 } from 'lucide-react'

import { ApiError } from '../../api/client'
import * as leaveApi from '../../api/leaveApi'

import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { ErrorState, LoadingState } from '../../components/common/States'
import DocumentsNotice from '../../components/student/DocumentsNotice'

import { useRequest } from '../../hooks/useRequest'

import { daysBetween, formatDateTime } from '../../utils/format'
import {
  canComplete,
  canSubmit,
  canWithdraw,
  isEditable,
  REQUEST_TYPE_LABELS,
} from '../../utils/leave'

import type { HistoryEntry, LeaveRequest } from '../../types/leave'

type PendingAction = 'withdraw' | 'complete'

interface DetailsData {
  request: LeaveRequest
  entries: HistoryEntry[]
}

export default function LeaveDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [isActing, setIsActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const { data, error, isLoading, reload } = useRequest<DetailsData | null>(
    id ?? 'unknown',
    async () => {
      if (!id) return null
      const [request, history] = await Promise.all([
        leaveApi.show(id),
        leaveApi.history(id),
      ])
      return { request, entries: history.items }
    },
  )

  const runAction = async (action: 'submit' | PendingAction) => {
    if (!data) return

    setIsActing(true)
    setActionError(null)

    try {
      if (action === 'submit') {
        await leaveApi.submit(data.request.id)
        toast.success('Request submitted for approval')
      } else if (action === 'withdraw') {
        await leaveApi.withdraw(data.request.id)
        toast.success('Request withdrawn')
      } else {
        await leaveApi.complete(data.request.id)
        toast.success('Request marked as completed')
      }

      setPendingAction(null)
      reload()
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : 'The action could not be completed. Please try again.'
      setActionError(message)
      toast.error(message)
      setPendingAction(null)
    } finally {
      setIsActing(false)
    }
  }

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
      </div>
    )
  }

  if (!data) return null

  const { request, entries } = data
  const duration = daysBetween(request.start_at, request.end_at)

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <button
            type="button"
            onClick={() => navigate('/student/history')}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to my requests
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-page-title">{REQUEST_TYPE_LABELS[request.request_type]}</h1>
            <Badge status={request.status} />
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Requested {formatDateTime(request.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isEditable(request.status) && (
            <Button variant="secondary" to={`/student/apply?edit=${request.id}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          )}

          {canSubmit(request.status) && (
            <Button onClick={() => void runAction('submit')} isLoading={isActing}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit request
            </Button>
          )}

          {canWithdraw(request.status) && (
            <Button
              variant="danger"
              onClick={() => setPendingAction('withdraw')}
              disabled={isActing}
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              Withdraw
            </Button>
          )}

          {canComplete(request.status) && (
            <Button
              variant="secondary"
              onClick={() => setPendingAction('complete')}
              disabled={isActing}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Mark as completed
            </Button>
          )}
        </div>
      </header>

      {actionError && (
        <p
          role="alert"
          className="app-card mb-4 border-destructive/40 p-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}

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
          <DocumentsNotice />

          <div className="app-card p-4">
            <h2 className="text-sm font-semibold text-foreground">What happens next</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {request.status === 'pending' &&
                'Your Head of Department is reviewing the request. You can still withdraw it until a decision is made.'}
              {request.status === 'changes_requested' &&
                'The Head of Department asked for changes. Edit the request and submit it again.'}
              {request.status === 'approved' &&
                'The request is approved. Mark it as completed once the leave has ended.'}
              {request.status === 'completed' &&
                'This request is closed. The history above shows everything that happened.'}
              {request.status === 'rejected' &&
                'The request was not granted. You can send a new request if the situation changes.'}
              {request.status === 'withdrawn' &&
                'You withdrew this request. You can send a new request whenever you need to.'}
              {request.status === 'draft' &&
                'This is still a draft. Submit it when you are ready for it to be reviewed.'}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Something wrong?{' '}
            <Link
              to="/student/history"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              See all your requests
            </Link>
            .
          </p>
        </aside>
      </div>

      <Modal
        isOpen={pendingAction !== null}
        title={
          pendingAction === 'withdraw' ? 'Withdraw this request?' : 'Mark as completed?'
        }
        description={
          pendingAction === 'withdraw'
            ? 'The request is withdrawn and the Head of Department will no longer see it as pending. This cannot be undone.'
            : 'Use this once the approved leave has ended. The request is closed and can no longer be changed.'
        }
        onClose={() => setPendingAction(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button
              variant={pendingAction === 'withdraw' ? 'danger' : 'primary'}
              isLoading={isActing}
              onClick={() => {
                if (pendingAction) void runAction(pendingAction)
              }}
            >
              {pendingAction === 'withdraw' ? 'Withdraw request' : 'Mark as completed'}
            </Button>
          </>
        }
      />
    </div>
  )
}

interface FieldProps {
  label: string
  children: ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  )
}
