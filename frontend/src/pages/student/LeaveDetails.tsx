import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  Pencil,
  Send,
  Undo2,
} from 'lucide-react'

import { ApiError } from '../../api/client'
import * as leaveApi from '../../api/leaveApi'

import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Callout from '../../components/common/Callout'
import Field from '../../components/common/Field'
import Modal from '../../components/common/Modal'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, LoadingState } from '../../components/common/States'
import DocumentsNotice from '../../components/student/DocumentsNotice'

import { useRequest } from '../../hooks/useRequest'

import { daysBetween, formatDateTime } from '../../utils/format'
import {
  canComplete,
  canSubmit,
  canWithdraw,
  isEditable,
  REQUEST_STATUS_LABELS,
} from '../../utils/leave'
import { REQUEST_STATUS_TONES } from '../../utils/status'

import type { HistoryEntry, LeaveRequest, RequestStatus } from '../../types/leave'

type PendingAction = 'withdraw' | 'complete'

interface DetailsData {
  request: LeaveRequest
  entries: HistoryEntry[]
}

/** What the reader is told about the state of the request. */
const NEXT_STEP: Record<RequestStatus, { title: string; text: string }> = {
  draft: {
    title: 'This is still a draft',
    text: 'Submit it when you are ready for it to be reviewed.',
  },
  pending: {
    title: 'The HOD is reviewing it',
    text: 'Your Head of Department is reviewing the request. You can still withdraw it until a decision is made.',
  },
  changes_requested: {
    title: 'Changes were requested',
    text: 'The Head of Department asked for changes. Edit the request and submit it again.',
  },
  approved: {
    title: 'The request is approved',
    text: 'Mark it as completed once the leave has ended.',
  },
  rejected: {
    title: 'The request was not granted',
    text: 'You can send a new request if the situation changes.',
  },
  withdrawn: {
    title: 'You withdrew this request',
    text: 'You can send a new request whenever you need to.',
  },
  completed: {
    title: 'This request is closed',
    text: 'The history below shows everything that happened.',
  },
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
  const next = NEXT_STEP[request.status]

  return (
    <div className="app-page">
      <PageHeader
        title={REQUEST_TYPE_LABELS[request.request_type]}
        description={`Requested ${formatDateTime(request.created_at)}`}
        eyebrow={
          <button
            type="button"
            onClick={() => navigate('/student/history')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to my requests
          </button>
        }
        actions={
          <>
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
          </>
        }
      />

      <div className="mb-5">
        <Badge status={request.status} withDot />
      </div>

      {actionError && (
        <Callout
          tone="danger"
          role="alert"
          title="The action could not be completed"
          className="mb-5"
        >
          {actionError}
        </Callout>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
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
              <p className="mt-1.5 text-sm whitespace-pre-wrap break-words text-muted-foreground">
                {request.reason}
              </p>
            </div>
          </section>

          {request.decision_reason && (
            <Callout
              tone={REQUEST_STATUS_TONES[request.status]}
              title="Decision"
            >
              <p className="whitespace-pre-wrap break-words">{request.decision_reason}</p>
              <p className="mt-2 text-xs">Decided {formatDateTime(request.decided_at)}</p>
            </Callout>
          )}

          <section className="app-card p-5 md:p-6">
            <h2 className="text-section-title">History</h2>

            {entries.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing has happened to this request yet.
              </p>
            ) : (
              <ol className="mt-5 space-y-0">
                {entries.map((entry, index) => (
                  <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < entries.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute top-6 left-[11px] h-full w-px bg-border"
                      />
                    )}

                    <span
                      aria-hidden="true"
                      className="relative mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 ring-4 ring-card"
                    >
                      <span className="h-2 w-2 rounded-full bg-brand-600" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {entry.old_status
                          ? `${entry.old_status.replaceAll('_', ' ')} → ${entry.new_status.replaceAll('_', ' ')}`
                          : `Created as ${entry.new_status.replaceAll('_', ' ')}`}
                      </p>

                      {entry.comment && (
                        <p className="mt-1 text-sm break-words whitespace-pre-wrap text-muted-foreground">
                          {entry.comment}
                        </p>
                      )}

                      <p className="app-numeric mt-1 text-xs text-muted-foreground">
                        {formatDateTime(entry.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Callout tone={REQUEST_STATUS_TONES[request.status]} title={next.title}>
            {next.text}
          </Callout>

          <DocumentsNotice />

          <p className="text-xs leading-relaxed text-muted-foreground">
            Something wrong?{' '}
            <Link to="/student/history" className="app-link">
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
