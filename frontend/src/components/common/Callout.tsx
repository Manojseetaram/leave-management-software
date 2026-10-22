import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MessageSquareWarning,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'violet' | 'neutral'

interface ToneStyle {
  box: string
  icon: string
}

const TONE_STYLES: Record<CalloutTone, ToneStyle> = {
  info: {
    box: 'border-info/30 bg-info-soft',
    icon: 'bg-info/15 text-info',
  },
  success: {
    box: 'border-status-approved/30 bg-status-approved-soft',
    icon: 'bg-status-approved/15 text-status-approved',
  },
  warning: {
    box: 'border-status-pending/40 bg-status-pending-soft',
    icon: 'bg-status-pending/20 text-status-pending',
  },
  danger: {
    box: 'border-destructive/30 bg-destructive/10',
    icon: 'bg-destructive/15 text-destructive',
  },
  violet: {
    box: 'border-status-changes/30 bg-status-changes-soft',
    icon: 'bg-status-changes/15 text-status-changes',
  },
  neutral: {
    box: 'border-border bg-muted/60',
    icon: 'bg-muted text-muted-foreground',
  },
}

const TONE_ICONS: Record<CalloutTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  violet: MessageSquareWarning,
  neutral: Info,
}

interface CalloutProps {
  tone?: CalloutTone
  /** The headline of the message. */
  title?: string
  /** Replaces the icon that matches the tone. */
  icon?: LucideIcon
  children?: ReactNode
  /** An action shown under the message, for example a retry button. */
  action?: ReactNode
  /** `alert` announces the message the moment it appears. */
  role?: 'alert' | 'status'
  className?: string
}

/**
 * A short message in a tinted panel.
 *
 * Every note in the application uses this one component, so a warning always
 * looks the same whether it comes from a form or from a missing endpoint.
 */
export default function Callout({
  tone = 'neutral',
  title,
  icon,
  children,
  action,
  role,
  className = '',
}: CalloutProps) {
  const style = TONE_STYLES[tone]
  const Icon = icon ?? TONE_ICONS[tone]

  return (
    <div role={role} className={`rounded-lg border p-4 ${style.box} ${className}`}>
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${style.icon}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-sm font-semibold text-foreground">{title}</p>
          )}

          {children && (
            <div className={`text-sm text-muted-foreground ${title ? 'mt-1' : ''}`}>
              {children}
            </div>
          )}

          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  )
}
