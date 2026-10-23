import { useState } from 'react'
import { KeyRound, MonitorSmartphone, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError } from '../../api/client'
import * as authApi from '../../api/authApi'

import Button from '../../components/common/Button'
import Field from '../../components/common/Field'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, LoadingState } from '../../components/common/States'
import FacultyNotice from '../../components/faculty/FacultyNotice'

import { useAuth } from '../../context/useAuth'
import { useRequest } from '../../hooks/useRequest'

import { formatDateTime } from '../../utils/format'

import type { SessionInfo } from '../../types/auth'

/**
 * The Faculty dashboard.
 *
 * Everything on it is the signed-in faculty member's own account, read from
 * the endpoints a faculty member can use today: GET /auth/me and
 * GET /auth/sessions.
 */
export default function Dashboard() {
  const { user, roles } = useAuth()

  const [isRevoking, setIsRevoking] = useState(false)

  const {
    data: sessions,
    error,
    isLoading,
    reload,
  } = useRequest<SessionInfo[]>('faculty-sessions', async () => {
    const response = await authApi.listSessions()
    return response.items
  })

  const revokeSession = async (sessionId: string) => {
    setIsRevoking(true)
    try {
      await authApi.revokeSession(sessionId)
      toast.success('Session signed out')
      reload()
    } catch (caught) {
      toast.error(
        caught instanceof ApiError
          ? caught.message
          : 'The session could not be signed out.',
      )
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <div className="app-page">
      <PageHeader
        title="Dashboard"
        description="Your account, your role and the devices that are signed in to it."
        actions={
          <Button variant="secondary" to="/change-password">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Change password
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="app-card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h2 className="text-section-title">My account</h2>
          </div>

          {user ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Name">{user.full_name}</Field>
              <Field label="Email">{user.email ?? '—'}</Field>
              <Field label="Role">
                {roles.length > 0
                  ? roles.map((role) => role.charAt(0).toUpperCase() + role.slice(1)).join(', ')
                  : '—'}
              </Field>
              <Field label="Account status">{user.status}</Field>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              The signed-in account could not be read.
            </p>
          )}
        </section>

        <section className="app-card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h2 className="text-section-title">Active sessions</h2>
          </div>

          {isLoading ? (
            <LoadingState label="Loading your sessions..." />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !sessions || sessions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No active sessions.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm text-foreground">
                      Started {formatDateTime(session.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDateTime(session.expires_at)}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={isRevoking}
                    onClick={() => void revokeSession(session.id)}
                  >
                    Sign out this device
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6">
        <FacultyNotice title="The student roster is not available yet">
          The backend gives a faculty member no readable endpoint for students and
          their leave requests: the role holds only the `students:read` permission,
          which no handler uses. The two routes the console is written against —
          <code className="mx-1">GET /faculty/students</code> and
          <code className="mx-1">GET /faculty/leave-requests</code> — are specified in
          <code className="mx-1">docs/faculty-api-contract.md</code> and are not in
          the router yet, so this console cannot show a roster today. The
          <span className="mx-1">Student requests</span>
          screen says the same and picks the data up as soon as the routes exist.
        </FacultyNotice>
      </section>
    </div>
  )
}
