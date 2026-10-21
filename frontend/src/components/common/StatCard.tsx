import type { LucideIcon } from 'lucide-react'

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
  icon?: LucideIcon
  tone?: StatTone
}

const TONE_CLASSES: Record<StatTone, string> = {
  default: 'text-foreground',
  success: 'text-status-approved',
  warning: 'text-status-pending',
  danger: 'text-status-rejected',
  info: 'text-brand-600',
}

const ICON_TONE_CLASSES: Record<StatTone, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-status-approved-soft text-status-approved',
  warning: 'bg-status-pending-soft text-status-pending',
  danger: 'bg-status-rejected-soft text-status-rejected',
  info: 'bg-brand-50 text-brand-600',
}

/** A single number with a label, used on the dashboards. */
export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: StatCardProps) {
  return (
    <div className="app-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className={`mt-2 text-stat font-semibold ${TONE_CLASSES[tone]}`}>{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>

        {Icon && (
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ICON_TONE_CLASSES[tone]}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )
}
