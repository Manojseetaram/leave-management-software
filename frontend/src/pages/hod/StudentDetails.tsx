import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import * as studentApi from '../../api/studentApi'

import Button from '../../components/common/Button'
import Field from '../../components/common/Field'
import LeaveRequestTable from '../../components/common/LeaveRequestTable'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { useRequest } from '../../hooks/useRequest'

import { formatDate, formatDateTime } from '../../utils/format'
import { STUDENT_STATUS_LABELS } from '../../utils/student'

import type { Paged } from '../../types/api'
import type { LeaveRequest } from '../../types/leave'
import type { ParentContact, StudentFilterStatus, StudentRecord } from '../../types/student'

const PER_PAGE = 20

const STATUS_CLASSES: Record<StudentFilterStatus, string> = {
  active: 'bg-status-approved-soft text-status-approved',
  inactive: 'bg-status-pending-soft text-status-pending',
  graduated: 'bg-status-completed-soft text-status-completed',
  archived: 'bg-status-withdrawn-soft text-status-withdrawn',
}

/**
 * The record of one student, as the HOD sees it: the account itself, the
 * leave requests behind it and the parents who are notified about them.
 */
export default function StudentDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const {
    data: student,
    error,
    isLoading,
    reload,
  } = useRequest<StudentRecord | null>(id ?? 'unknown', async () => {
    if (!id) return null
    return studentApi.show(id)
  })

  const {
    data: leaveRequests,
    error: historyError,
    isLoading: isHistoryLoading,
    reload: reloadHistory,
  } = useRequest<Paged<LeaveRequest>>(
    `student-history:${id ?? 'unknown'}:${page}`,
    async () => {
      if (!id) return { items: [], total: 0, page: 1, per_page: PER_PAGE }
      return studentApi.history(id, { page, per_page: PER_PAGE })
    },
  )

  const {
    data: parents,
    error: parentsError,
  } = useRequest<ParentContact[]>(
    `student-parents:${id ?? 'unknown'}`,
    async () => {
      if (!id) return []
      const response = await studentApi.parents(id)
      return response.items
    },
  )

  if (isLoading) {
    return (
      <div className="app-page">
        <LoadingState label="Loading the student..." />
      </div>
    )
  }

  if (error && !student) {
    return (
      <div className="app-page">
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>

        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/hod/students')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to the students
          </Button>
        </div>
      </div>
    )
  }

  if (!student) return null

  const requests = leaveRequests?.items ?? []

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <button
            type="button"
            onClick={() => navigate('/hod/students')}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to the students
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-page-title">{student.full_name}</h1>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
                STATUS_CLASSES[student.status] ?? 'bg-muted text-muted-foreground'
              }`}
            >
              {STUDENT_STATUS_LABELS[student.status] ?? student.status}
            </span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {student.register_number} · {student.department}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="app-card p-5 md:p-6">
            <h2 className="text-section-title">Student details</h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Register number">{student.register_number}</Field>
              <Field label="Full name">{student.full_name}</Field>
              <Field label="Email">{student.email ?? '—'}</Field>
              <Field label="Department">{student.department}</Field>
              <Field label="Semester">{student.semester}</Field>
              <Field label="Section">{student.section ?? '—'}</Field>
              <Field label="Admission year">
                {student.admission_year ?? '—'}
              </Field>
              <Field label="Registered">{formatDate(student.created_at)}</Field>
            </dl>

            {student.deleted_at && (
              <p className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">
                This account was archived on {formatDateTime(student.deleted_at)}.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-section-title mb-3">Leave history</h2>

            {isHistoryLoading ? (
              <div className="app-card">
                <LoadingState label="Loading the leave history..." />
              </div>
            ) : historyError ? (
              <div className="app-card">
                <ErrorState message={historyError} onRetry={reloadHistory} />
              </div>
            ) : requests.length === 0 ? (
              <div className="app-card">
                <EmptyState
                  title="No leave requests"
                  description="This student has not sent any leave request yet."
                />
              </div>
            ) : (
              <>
                <LeaveRequestTable
                  requests={requests}
                  caption="Leave history"
                  linkBase="/hod/requests"
                />

                {leaveRequests && (
                  <div className="app-card mt-4">
                    <Pagination
                      page={leaveRequests.page}
                      perPage={leaveRequests.per_page}
                      total={leaveRequests.total}
                      onPageChange={setPage}
                      isLoading={isHistoryLoading}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="app-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Parents</h2>

            {parentsError ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                The parent contacts could not be loaded.
              </p>
            ) : !parents || parents.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No parent is registered for this student.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {parents.map((parent) => (
                  <li key={parent.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                    <p className="text-sm font-medium text-foreground">{parent.full_name}</p>
                    <p className="text-xs text-muted-foreground">{parent.relationship}</p>

                    <dl className="mt-1.5 space-y-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Verified</dt>
                        <dd className="text-foreground">
                          {parent.verified_at ? formatDate(parent.verified_at) : 'No'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">SMS consent</dt>
                        <dd className="text-foreground">
                          {parent.sms_consent_at ? formatDate(parent.sms_consent_at) : 'No'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Active</dt>
                        <dd className="text-foreground">{parent.active ? 'Yes' : 'No'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              The phone number is never sent to the browser.
            </p>
          </div>

          <div className="app-card p-4">
            <h2 className="text-sm font-semibold text-foreground">What to do here</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Open a request from the history to decide it. The student record itself
              is changed from the roster.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
