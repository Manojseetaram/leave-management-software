import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** The name of the screen. */
  title: string
  /** The line under the title. */
  description?: ReactNode
  /** A small line above the title, for example a back link. */
  eyebrow?: ReactNode
  /** The buttons on the right of the header. */
  actions?: ReactNode
}

/**
 * The heading of a screen.
 *
 * Every page names itself the same way: a title, a line that says what the
 * screen is for, and the actions on the right. On a phone the actions drop
 * under the title.
 */
export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}

        <h1 className="text-page-title text-foreground">{title}</h1>

        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
