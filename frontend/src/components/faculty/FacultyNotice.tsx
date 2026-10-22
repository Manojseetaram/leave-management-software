import type { ReactNode } from 'react'
import { GraduationCap } from 'lucide-react'

interface FacultyNoticeProps {
  title: string
  children?: ReactNode
  action?: ReactNode
}

/**
 * The Faculty gap, kept in one component.
 *
 * The backend gives a faculty member no Faculty-scoped read endpoint yet:
 * the role holds only `students:read`, which no handler honours, so
 * `GET /faculty/students` and `GET /faculty/leave-requests` answer 404 until
 * the routes in docs/faculty-api-contract.md are implemented. The screens
 * say so plainly instead of showing an empty roster.
 */
export default function FacultyNotice({ title, children, action }: FacultyNoticeProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4">
      <div className="flex items-start gap-3">
        <GraduationCap
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />

        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  )
}
