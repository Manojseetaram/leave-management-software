import { AlertTriangle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import Button from './Button'

interface LoadingStateProps {
  label?: string
}

/** Shown while a request is in flight. */
export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

/** Shown when a request succeeded but returned nothing. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state px-6 py-12">
      <Inbox className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
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
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-base font-medium text-foreground">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  )
}
