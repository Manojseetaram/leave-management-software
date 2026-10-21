import { useId, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  /** Validation message. When present the field is marked as invalid. */
  error?: string
  hint?: string
}

export default function Textarea({
  label,
  error,
  hint,
  id,
  className = '',
  rows = 4,
  ...rest
}: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const messageId = `${textareaId}-message`

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`w-full resize-y rounded-lg border bg-card px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${error ? 'border-destructive' : 'border-input'} ${className}`}
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
