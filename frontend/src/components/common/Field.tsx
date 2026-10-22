import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  children: ReactNode
}

/** One label and value pair inside a description list. */
export default function Field({ label, children }: FieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  )
}
