import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, MessageSquareWarning, XCircle } from 'lucide-react'

import { ApiError } from '../../api/client'
import * as leaveApi from '../../api/leaveApi'

import Button from '../common/Button'
import Modal from '../common/Modal'
import Textarea from '../common/Textarea'

import {
  canApprove,
  canReject,
  canRequestChanges,
  requiresComment,
  type DecisionAction,
} from '../../utils/leave'

import type { LeaveRequest } from '../../types/leave'

interface DecisionPanelProps {
  request: LeaveRequest
  /** Called once the backend has accepted the decision. */
  onDecided: () => void
}

interface DecisionCopy {
  title: string
  description: string
  confirmLabel: string
  commentLabel: string
  commentHint: string
  missingComment: string
  success: string
}

const DECISION_COPY: Record<DecisionAction, DecisionCopy> = {
  approve: {
    title: 'Approve this request?',
    description:
      'The student is told that the leave is approved, and a message to the parent is queued.',
    confirmLabel: 'Approve request',
    commentLabel: 'Note for the student',
    commentHint: 'Optional. It is shown to the student and kept in the history.',
    missingComment: '',
    success: 'Request approved',
  },
  reject: {
    title: 'Reject this request?',
    description:
      'The student is told that the request was not granted. A reason is required.',
    confirmLabel: 'Reject request',
    commentLabel: 'Reason',
    commentHint: 'Required. The student reads this, so say why it was not granted.',
    missingComment: 'A reason is required to reject the request.',
    success: 'Request rejected',
  },
  request_changes: {
    title: 'Ask the student for changes?',
    description:
      'The request goes back to the student, who can change it and send it again.',
    confirmLabel: 'Request changes',
    commentLabel: 'What has to change',
    commentHint: 'Required. Tell the student what is missing.',
    missingComment: 'Say what has to change before sending the request back.',
    success: 'Changes requested',
  },
}

/**
 * The decisions the HOD can take on a request.
 *
 * The backend owns the workflow: it answers a transition that does not fit
 * the state with a conflict, and it refuses a rejection without a reason.
 */
export default function DecisionPanel({ request, onDecided }: DecisionPanelProps) {
  const [action, setAction] = useState<DecisionAction | null>(null)
  const [comment, setComment] = useState('')
  const [isActing, setIsActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = (next: DecisionAction) => {
    setAction(next)
    setComment('')
    setError(null)
  }

  const close = () => {
    if (isActing) return
    setAction(null)
    setComment('')
    setError(null)
  }

  const submit = async () => {
    if (!action) return

    const copy = DECISION_COPY[action]
    const trimmed = comment.trim()

    if (requiresComment(action) && trimmed.length === 0) {
      setError(copy.missingComment)
      return
    }

    setIsActing(true)
    setError(null)

    try {
      if (action === 'approve') {
        await leaveApi.approve(request.id, trimmed ? { comment: trimmed } : {})
      } else if (action === 'reject') {
        await leaveApi.reject(request.id, { comment: trimmed })
      } else {
        await leaveApi.requestChanges(request.id, { comment: trimmed })
      }

      toast.success(copy.success)
      setAction(null)
      setComment('')
      onDecided()
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : 'The decision could not be recorded. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setIsActing(false)
    }
  }

  const canApproveRequest = canApprove(request.status)
  const canRejectRequest = canReject(request.status)
  const canAskForChanges = canRequestChanges(request.status)

  if (!canApproveRequest && !canRejectRequest && !canAskForChanges) return null

  const copy = action ? DECISION_COPY[action] : null

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canApproveRequest && (
          <Button onClick={() => open('approve')} disabled={isActing}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Approve
          </Button>
        )}

        {canAskForChanges && (
          <Button variant="secondary" onClick={() => open('request_changes')} disabled={isActing}>
            <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
            Request changes
          </Button>
        )}

        {canRejectRequest && (
          <Button variant="danger" onClick={() => open('reject')} disabled={isActing}>
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
        )}
      </div>

      <Modal
        isOpen={action !== null}
        title={copy?.title ?? ''}
        description={copy?.description}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={isActing}>
              Cancel
            </Button>
            <Button
              variant={action === 'reject' ? 'danger' : 'primary'}
              isLoading={isActing}
              onClick={() => void submit()}
            >
              {copy?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {action && (
          <Textarea
            label={DECISION_COPY[action].commentLabel}
            hint={DECISION_COPY[action].commentHint}
            error={error ?? undefined}
            value={comment}
            rows={4}
            onChange={(event) => {
              setComment(event.target.value)
              if (error) setError(null)
            }}
          />
        )}
      </Modal>
    </>
  )
}
