import { useState, type ReactNode } from 'react'
import { KeyRound, MonitorSmartphone, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError } from '../../api/client'
import * as authApi from '../../api/authApi'
import * as studentApi from '../../api/studentApi'

import Button from '../../components/common/Button'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { useAuth } from '../../context/useAuth'
import { useRequest } from '../../hooks/useRequest'

import { formatDateTime } from '../../utils/format'

import type { SessionInfo } from '../../types/auth'
import type { ParentContact, StudentRecord } from '../../types/student'

interface ProfileData {
  student: StudentRecord | null
  parents: ParentContact[]
  sessions: SessionInfo[]
}

export default function Profile() {
  const { user, studentId } = useAuth()

  const [isRevoking, setIsRevoking] = useState(false)

  const { data, error, isLoading, reload } = useRequest<ProfileData>(
    studentId ?? 'no-student',
    async () => {
      const [profile, contactList, sessionList] = await Promise.all([
        studentId ? studentApi.show(studentId) : Promise.resolve(null),
        studentId ? studentApi.parents(studentId) : Promise.resolve({ items: [] }),
        authApi.listSessions(),
      ])

      return {
        student: profile,
        parents: contactList.items,
        sessions: sessionList.items,
      }
    },
  )

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

  if (isLoading) {
    return (
      <div className="app-page">
        <LoadingState label="Loading your profile..." />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="app-page">
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { student, parents, sessions } = data

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your student record, your parent contacts and your active sessions.
          </p>
        </div>

        <Button variant="secondary" to="/change-password">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Change password
        </Button>
      </header>

      {error && (
        <p
          role="alert"
          className="app-card mb-4 border-destructive/40 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="app-card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h2 className="text-section-title">Student record</h2>
          </div>

          {student ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Name">{student.full_name}</Field>
              <Field label="Register number">{student.register_number}</Field>
              <Field label="Department">{student.department}</Field>
              <Field label="Semester">{student.semester}</Field>
              <Field label="Section">{student.section || '—'}</Field>
              <Field label="Admission year">
                {student.admission_year ? String(student.admission_year) : '—'}
              </Field>
              <Field label="Account status">{student.status}</Field>
              <Field label="Email">{user?.email ?? '—'}</Field>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No student record is linked to this account. Contact the Head of
              Department if that is unexpected.
            </p>
          )}
        </section>

        <section className="app-card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h2 className="text-section-title">Parent contacts</h2>
          </div>

          {parents.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="No parent contacts"
                description="Parent contacts are managed by the department. They receive a notification when a request is submitted."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {parents.map((parent) => (
                <li
                  key={parent.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{parent.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {parent.relationship}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      parent.verified_at
                        ? 'bg-status-approved-soft text-status-approved'
                        : 'bg-status-pending-soft text-status-pending'
                    }`}
                  >
                    {parent.verified_at ? 'Verified' : 'Not verified'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="app-card p-5 md:p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h2 className="text-section-title">Active sessions</h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Every device that is currently signed in to your account. Signing one out
            revokes it immediately — including the device you are using now.
          </p>

          {sessions.length === 0 ? (
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
    </div>
  )
}

interface FieldProps {
  label: string
  children: ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  )
}
