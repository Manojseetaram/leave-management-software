import { useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Validation message. When present the field is marked as invalid. */
  error?: string
  hint?: string
}

export default function Input({
  label,
  error,
  hint,
  id,
  className = '',
  ...rest
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${error ? 'border-destructive' : 'border-input'} ${className}`}
        {...rest}
      />

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
