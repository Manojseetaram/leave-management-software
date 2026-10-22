import type { ReactNode } from 'react'

import StatusBadge from './StatusBadge'

import { REQUEST_STATUS_LABELS } from '../../utils/leave'
import { REQUEST_STATUS_TONES } from '../../utils/status'

import type { RequestStatus } from '../../types/leave'

interface BadgeProps {
  status: RequestStatus
  children?: ReactNode
  className?: string
}

/** Coloured pill that mirrors the leave workflow state. */
export default function Badge({ status, children, className = '' }: BadgeProps) {
  return (
    <StatusBadge tone={REQUEST_STATUS_TONES[status]} className={className}>
      {children ?? REQUEST_STATUS_LABELS[status]}
    </StatusBadge>
  )
}
