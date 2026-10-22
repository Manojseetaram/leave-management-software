import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Validation message. When present the field is marked as invalid. */
  error?: string
  hint?: string
  /** An icon shown inside the field, before the text. */
  leadingIcon?: LucideIcon
  /** A control shown inside the field, after the text. */
  trailing?: ReactNode
}

/**
 * The text field of the application.
 *
 * The adornments - an icon at the front, a control at the back - sit inside
 * the field and the padding follows them, so a field with an icon lines up
 * with a field without one.
 */
export default function Input({
  label,
  error,
  hint,
  id,
  className = '',
  leadingIcon: LeadingIcon,
  trailing,
  ...rest
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  const padding = LeadingIcon
    ? trailing
      ? 'pl-10 pr-10'
      : 'pl-10 pr-3'
    : trailing
      ? 'pl-3 pr-10'
      : 'px-3'

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        {LeadingIcon && (
          <LeadingIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
        )}

        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={`app-control h-10 ${padding} ${className}`}
          {...rest}
        />

        {trailing && (
          <div className="absolute top-1/2 right-1.5 -translate-y-1/2">{trailing}</div>
        )}
      </div>

      {(error || hint) && (
        <p
          id={messageId}
          className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
