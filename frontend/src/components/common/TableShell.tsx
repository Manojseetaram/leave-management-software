import type { ReactNode } from 'react'

interface TableShellProps {
  /** The description a screen reader reads out for the table. */
  caption?: string
  /** The horizontal floor, so the columns keep their shape. */
  minWidth?: string
  /** Shown under the table, inside the same card. */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * The card and the scroll container every data table sits in.
 *
 * The table itself is written by the caller, so each list can show its own
 * columns, but the frame, the header and the row behaviour are the same
 * everywhere.
 */
export default function TableShell({
  caption,
  minWidth = '40rem',
  footer,
  children,
  className = '',
}: TableShellProps) {
  return (
    <div className={`app-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="app-table" style={{ minWidth }}>
          {caption && <caption className="sr-only">{caption}</caption>}
          {children}
        </table>
      </div>

      {footer && <div className="border-t border-border">{footer}</div>}
    </div>
  )
}
