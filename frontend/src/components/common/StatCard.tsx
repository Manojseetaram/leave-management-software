import type { LucideIcon } from 'lucide-react'

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface StatCardProps {
  label: string
  value: number | string
  hint?: string
  icon?: LucideIcon
  tone?: StatTone
}

const VALUE_CLASSES: Record<StatTone, string> = {
  default: 'text-foreground',
  success: 'text-status-approved',
  warning: 'text-status-pending',
  danger: 'text-status-rejected',
  info: 'text-brand-600',
}

const ICON_CLASSES: Record<StatTone, string> = {
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
          <p className="app-label truncate">{label}</p>
          <p
            className={`app-numeric mt-2 text-stat font-semibold ${VALUE_CLASSES[tone]}`}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>

        {Icon && (
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ICON_CLASSES[tone]}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )
}
