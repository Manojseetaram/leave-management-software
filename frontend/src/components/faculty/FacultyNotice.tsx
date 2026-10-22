import { GraduationCap } from 'lucide-react'
import type { ReactNode } from 'react'

import Callout from '../common/Callout'

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
    <Callout tone="info" icon={GraduationCap} title={title} action={action}>
      {children}
    </Callout>
  )
}
