import type { ReactNode } from 'react'

import { STATUS_TONE_CLASSES, type StatusTone } from '../../utils/status'

interface StatusBadgeProps {
  tone: StatusTone
  children: ReactNode
  className?: string
  /** Adds a small filled dot in the tone colour. */
  withDot?: boolean
}

/**
 * The pill that shows a status.
 *
 * The state is always written out, so the colour is a second signal and never
 * the only one.
 */
export default function StatusBadge({
  tone,
  children,
  className = '',
  withDot = false,
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_TONE_CLASSES[tone]} ${className}`}
    >
      {withDot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70"
        />
      )}
      {children}
    </span>
  )
}
