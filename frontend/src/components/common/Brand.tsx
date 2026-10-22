import { CalendarCheck } from 'lucide-react'

interface BrandProps {
  /** The console the mark sits above, for example "ISE Department". */
  subtitle?: string
  /** Leaves the mark alone, without the wordmark. */
  markOnly?: boolean
  /**
   * `default` sits on a light surface, `onGradient` on the brand panel of
   * the sign-in screen.
   */
  variant?: 'default' | 'onGradient'
  className?: string
}

/** The product mark used in the navigation rail, the top bar and on login. */
export default function Brand({
  subtitle,
  markOnly = false,
  variant = 'default',
  className = '',
}: BrandProps) {
  const onGradient = variant === 'onGradient'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          onGradient
            ? 'bg-white/15 text-white ring-1 ring-white/25'
            : 'bg-brand-gradient text-white'
        }`}
      >
        <CalendarCheck className="h-5 w-5" aria-hidden="true" />
      </span>

      {!markOnly && (
        <span className="min-w-0">
          <span
            className={`block truncate text-sm font-semibold ${
              onGradient ? 'text-white' : 'text-foreground'
            }`}
          >
            Leave Management
          </span>
          {subtitle && (
            <span
              className={`block truncate text-xs ${
                onGradient ? 'text-brand-100' : 'text-muted-foreground'
              }`}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
