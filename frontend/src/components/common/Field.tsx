import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  children: ReactNode
}

/** One label and value pair inside a description list. */
export default function Field({ label, children }: FieldProps) {
  return (
    <div className="min-w-0">
      <dt className="app-label">{label}</dt>
      <dd className="mt-1 text-sm break-words text-foreground">{children}</dd>
    </div>
  )
}
