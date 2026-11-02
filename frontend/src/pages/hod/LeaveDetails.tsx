import { useState, type ReactNode, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, ClipboardCheck, RotateCcw, XCircle } from 'lucide-react'

import { ApiError } from '../../api/client'
import * as documentApi from '../../api/documentApi'
import * as eventApi from '../../api/eventApi'
import * as leaveApi from '../../api/leaveApi'

import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { ErrorState, LoadingState } from '../../components/common/States'
import Textarea from '../../components/common/Textarea'
import { useRequest } from '../../hooks/useRequest'

import { formatDateTime } from '../../utils/format'
import { REQUEST_TYPE_LABELS } from '../../utils/leave'

import type { EventRecord } from '../../types/event'
import type { DocumentRecord } from '../../types/document'
import type { HistoryEntry, LeaveRequest } from '../../types/leave'

type ActionKind = 'approve' | 'reject' | 'request_changes' | 'return' | 'complete'

interface DetailsData {
  request: LeaveRequest
  entries: HistoryEntry[]
}

interface DocumentContext {
  documents: DocumentRecord[]
  event: EventRecord | null
}

export default function LeaveDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const detailsRequest = useRequest<DetailsData | null>(
    `leave:${id ?? 'unknown'}:details`,
    async () => {
      if (!id) throw new Error('The request could not be loaded.')
      const [request, entries] = await Promise.all([leaveApi.show(id), leaveApi.history(id)])
      return { request, entries: entries.items }
    },
  )

  const documentsRequest = useRequest<DocumentContext | null>(
    `leave:${id ?? 'unknown'}:documents`,
    async () => {
      if (!id) throw new Error('The request could not be loaded.')
      const request = await leaveApi.show(id)
      const event =
        request.request_type === 'event_permission'
          ? (await eventApi.list()).items.find((item) => item.leave_request_id === id) ?? null
          : null
      const source = event
        ? await documentApi.listEvidence(event.id)
        : await documentApi.listForRequest(id)
      return { documents: source.items, event }
    },
  )

  const [isActing, setIsActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<ActionKind | null>(null)
  const [comment, setComment] = useState('')
  const [reviewTarget, setReviewTarget] = useState<DocumentRecord | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'verified' | 'rejected'>('verified')
  const [reviewNotes, setReviewNotes] = useState('')

  const details = detailsRequest.data
  const documents = documentsRequest.data

  if (detailsRequest.isLoading) {
    return (
      <div className="app-page">
        <LoadingState label="Loading the request..." />
      </div>
    )
  }

  if (detailsRequest.error && !details) {
    return (
      <div className="app-page">
        <div className="app-card">
          <ErrorState message={detailsRequest.error} onRetry={detailsRequest.reload} />
        </div>
      </div>
    )
  }

  if (documentsRequest.isLoading || !details || !documents) {
    return (
      <div className="app-page">
        <LoadingState label="Loading the request..." />
      </div>
    )
  }

  if (detailsRequest.error) {
    return (
      <div className="app-page">
        <div className="app-card">
          <ErrorState message={detailsRequest.error} onRetry={detailsRequest.reload} />
        </div>
      </div>
    )
  }

  const { request } = details
  const actionable = request.status === 'pending'

  const runAction = async () => {
    if (!id || !pendingAction) return
    const trimmed = comment.trim()
    if (pendingAction === 'reject' || pendingAction === 'request_changes') {
      if (!trimmed) {
        setActionError('A comment is required for this action.')
        return
      }
    }

    setIsActing(true)
    setActionError(null)
    try {
      let updated: LeaveRequest

      if (pendingAction === 'approve') {
        updated = await leaveApi.approve(id, trimmed ? { comment: trimmed } : {})
      } else if (pendingAction === 'reject') {
        updated = await leaveApi.reject(id, { comment: trimmed })
      } else if (pendingAction === 'request_changes') {
        updated = await leaveApi.requestChanges(id, { comment: trimmed })
      } else if (pendingAction === 'return') {
        updated = await leaveApi.recordReturn(id, {})
      } else if (pendingAction === 'complete') {
        updated = await leaveApi.complete(id, {})
      } else {
        return
      }

      toast.success('The leave request was updated.')
      setPendingAction(null)
      setComment('')
      detailsRequest.reload()
      documentsRequest.reload()
      return updated
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : 'The action could not be completed. Please try again.'
      setActionError(message)
      toast.error(message)
    } finally {
      setIsActing(false)
    }
  }

  const confirmTitle = {
    approve: 'Approve this request?',
    reject: 'Reject this request?',
    request_changes: 'Request changes?',
    return: 'Record the return?',
    complete: 'Mark the request as completed?',
  }[pendingAction ?? 'approve']

  const confirmDescription = {
    approve: 'The Head of Department will consider this request approved and notify the verified parent.',
    reject: 'The request will be rejected and the student will be able to submit a new one.',
    request_changes: 'The student will be asked for more information before the request can be resubmitted.',
    return: 'The approved leave is closed as returned. The original approval decision is preserved.',
    complete: 'The approved leave is closed as completed. The original approval decision is preserved.',
  }[pendingAction ?? 'approve']

  const confirmRequiresComment = pendingAction === 'reject' || pendingAction === 'request_changes'

  const runReview = async () => {
    if (!reviewTarget) return
    setIsActing(true)
    setActionError(null)
    try {
      await documentApi.verify(reviewTarget.id, {
        status: reviewStatus,
        review_notes: reviewStatus === 'rejected' ? reviewNotes.trim() || 'Rejected by reviewer.' : undefined,
      })
      setReviewTarget(null)
      setReviewNotes('')
      await documentsRequest.reload()
      toast.success(`Evidence ${reviewStatus}.`)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'The review could not be saved.'
      setActionError(message)
      toast.error(message)
    } finally {
      setIsActing(false)
    }
  }

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
            Back to requests
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-page-title">{REQUEST_TYPE_LABELS[request.request_type]}</h1>
            <Badge status={request.status} />
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Request {request.id} · Student {request.student_id} · Submitted{' '}
            {formatDateTime(request.submitted_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {request.status === 'approved' && (
            <Button variant="secondary" onClick={() => setPendingAction('return')} disabled={isActing}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Record return
            </Button>
          )}

          {request.status === 'approved' && (
            <Button variant="secondary" onClick={() => setPendingAction('complete')} disabled={isActing}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Mark completed
            </Button>
          )}

          {actionable && (
            <>
              <Button variant="secondary" onClick={() => setPendingAction('approve')} disabled={isActing}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Approve
              </Button>
              <Button variant="danger" onClick={() => setPendingAction('reject')} disabled={isActing}>
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Reject
              </Button>
              <Button variant="secondary" onClick={() => setPendingAction('request_changes')} disabled={isActing}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Request changes
              </Button>
            </>
          )}
        </div>
      </header>

      {actionError && (
        <p role="alert" className="app-card mb-4 border-destructive/40 p-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="app-card p-5 md:p-6">
            <h2 className="text-section-title">Request</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="From">{formatDateTime(request.start_at)}</Detail>
              <Detail label="To">{formatDateTime(request.end_at)}</Detail>
              <Detail label="Duration">
                {`${Math.round(
                  (new Date(request.end_at).getTime() - new Date(request.start_at).getTime()) / 86_400_000,
                )} days`}
              </Detail>
              <Detail label="Student">{request.student_id}</Detail>
              <Detail label="Decision reason">{request.decision_reason ?? '—'}</Detail>
              <Detail label="Completion note">{request.completion_note ?? '—'}</Detail>
            </dl>

            <div className="mt-5 border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-foreground">Reason</h3>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-muted-foreground">{request.reason}</p>
            </div>
          </section>

          <section className="app-card p-5 md:p-6">
            <h2 className="text-section-title">History</h2>
            {details.entries.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing has happened yet.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {details.entries.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {entry.action
                          ? `${entry.action.replaceAll('_', ' ')} · ${entry.old_status?.replaceAll('_', ' ')} → ${entry.new_status.replaceAll('_', ' ')}`
                          : `${entry.old_status?.replaceAll('_', ' ')} → ${entry.new_status.replaceAll('_', ' ')}`}
                      </p>
                      {entry.comment && <p className="mt-0.5 text-sm text-muted-foreground">{entry.comment}</p>}
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="app-card p-5">
            <h2 className="text-section-title">Documents and evidence</h2>

            {documentsRequest.isLoading ? (
              <LoadingState label="Loading documents..." />
            ) : documentsRequest.error ? (
              <ErrorState message={documentsRequest.error} onRetry={documentsRequest.reload} />
            ) : !documents ? (
              <p className="mt-2 text-sm text-muted-foreground">No documents found.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {documents.documents.length === 0 && (
                  <li className="text-sm text-muted-foreground">No documents or evidence yet.</li>
                )}
                {documents.documents.map((document) => (
                  <li
                    key={document.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {document.original_filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {document.document_type} · {document.verification_status.replaceAll('_', ' ')}
                      </p>
                    </div>
                    {document.verification_status === 'unverified' && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isActing}
                          onClick={() => {
                            setReviewTarget(document)
                            setReviewStatus('verified')
                            setReviewNotes('')
                          }}
                        >
                          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={isActing}
                          onClick={() => {
                            setReviewTarget(document)
                            setReviewStatus('rejected')
                            setReviewNotes('')
                          }}
                        >
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {documents.event && (
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                Event evidence for <strong>{documents.event.title}</strong> is listed above and starts
                unverified.
              </p>
            )}
          </section>
        </aside>
      </div>

      <Modal
        isOpen={pendingAction !== null}
        title={confirmTitle}
        description={confirmDescription}
        onClose={() => setPendingAction(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingAction(null)} disabled={isActing}>
              Cancel
            </Button>
            <Button
              variant={pendingAction === 'reject' ? 'danger' : 'primary'}
              isLoading={isActing}
              onClick={() => void runAction()}
            >
              Confirm
            </Button>
          </>
        }
      >
        {confirmRequiresComment && (
          <Textarea
            label="Comment"
            value={comment}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setComment(event.target.value)}
            placeholder="Explain what the student should change."
          />
        )}
      </Modal>

      <Modal
        isOpen={reviewTarget !== null}
        title={reviewStatus === 'verified' ? 'Verify evidence?' : 'Reject evidence?'}
        description={
          reviewStatus === 'verified'
            ? 'The uploaded evidence will be marked verified after the integrity checks.'
            : 'A review note is required when rejecting evidence.'
        }
        onClose={() => setReviewTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewTarget(null)} disabled={isActing}>
              Cancel
            </Button>
            <Button
              variant={reviewStatus === 'rejected' ? 'danger' : 'primary'}
              isLoading={isActing}
              onClick={() => void runReview()}
            >
              Confirm
            </Button>
          </>
        }
      >
        {reviewStatus === 'rejected' && (
          <Textarea
            label="Review note"
            value={reviewNotes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReviewNotes(event.target.value)}
            placeholder="Why is this evidence rejected?"
          />
        )}
      </Modal>
    </div>
  )
}

interface DetailProps {
  label: string
  children: ReactNode
}

function Detail({ label, children }: DetailProps) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  )
}
