import { useId, type SelectHTMLAttributes } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  /** Validation message. When present the field is marked as invalid. */
  error?: string
  hint?: string
  placeholder?: string
}

export default function Select({
  label,
  options,
  error,
  hint,
  placeholder,
  id,
  className = '',
  ...rest
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const messageId = `${selectId}-message`

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${error ? 'border-destructive' : 'border-input'} ${className}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

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
