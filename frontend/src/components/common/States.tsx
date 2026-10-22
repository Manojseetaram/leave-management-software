import { AlertTriangle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import Button from './Button'

interface LoadingStateProps {
  label?: string
}

/** Shown while a request is in flight. */
export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </span>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

/** Shown when a request succeeded but returned nothing. */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="empty-state px-6 py-12">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden="true" />}
      </span>

      <p className="text-base font-semibold text-foreground">{title}</p>

      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

/** Shown when a request failed. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>

      <p className="text-base font-semibold text-foreground">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  )
}
