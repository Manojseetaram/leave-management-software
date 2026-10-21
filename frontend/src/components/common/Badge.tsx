import type { ReactNode } from 'react'

import { REQUEST_STATUS_LABELS } from '../../utils/leave'

import type { RequestStatus } from '../../types/leave'

const STATUS_CLASSES: Record<RequestStatus, string> = {
  draft: 'bg-status-draft-soft text-status-draft',
  pending: 'bg-status-pending-soft text-status-pending',
  changes_requested: 'bg-status-changes-soft text-status-changes',
  approved: 'bg-status-approved-soft text-status-approved',
  rejected: 'bg-status-rejected-soft text-status-rejected',
  withdrawn: 'bg-status-withdrawn-soft text-status-withdrawn',
  completed: 'bg-status-completed-soft text-status-completed',
}

interface BadgeProps {
  status: RequestStatus
  children?: ReactNode
  className?: string
}

/** Coloured pill that mirrors the leave workflow state. */
export default function Badge({ status, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_CLASSES[status]} ${className}`}
    >
      {children ?? REQUEST_STATUS_LABELS[status]}
    </span>
  )
}
