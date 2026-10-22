import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileText,
  History,
  XCircle,
} from 'lucide-react'

import * as leaveApi from '../../api/leaveApi'
import * as studentApi from '../../api/studentApi'

import Button from '../../components/common/Button'
import Field from '../../components/common/Field'
import LeaveRequestTable from '../../components/common/LeaveRequestTable'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { useAuth } from '../../context/useAuth'
import { useRequest } from '../../hooks/useRequest'

import type { LeaveRequest } from '../../types/leave'
import type { StudentRecord } from '../../types/student'

interface DashboardData {
  counts: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  recent: LeaveRequest[]
  student: StudentRecord | null
}

export default function Dashboard() {
  const { user, studentId } = useAuth()

  const { data, error, isLoading, reload } = useRequest<DashboardData>(
    studentId ?? 'no-student',
    async () => {
      // Each status is counted with its own query, so the totals are exact
      // and not limited to the rows of a single page.
      const [all, pending, approved, rejected, profile] = await Promise.all([
        leaveApi.list({ per_page: 5 }),
        leaveApi.list({ status: 'pending', per_page: 1 }),
        leaveApi.list({ status: 'approved', per_page: 1 }),
        leaveApi.list({ status: 'rejected', per_page: 1 }),
        studentId ? studentApi.show(studentId) : Promise.resolve(null),
      ])

      return {
        counts: {
          total: all.total,
          pending: pending.total,
          approved: approved.total,
          rejected: rejected.total,
        },
        recent: all.items,
        student: profile,
      }
    },
  )

  const counts = data?.counts
  const recent = data?.recent ?? []
  const student = data?.student ?? null

  return (
    <div className="app-page">
      <PageHeader
        title="Dashboard"
        description={
          user ? `Welcome back, ${user.full_name}` : 'Your leave requests at a glance'
        }
        actions={
          <>
            <Button variant="secondary" to="/student/history">
              <History className="h-4 w-4" aria-hidden="true" />
              My requests
            </Button>
            <Button to="/student/apply">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Apply for leave
            </Button>
          </>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading your requests..." />
      ) : error ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total requests"
              value={counts?.total ?? 0}
              icon={FileText}
              hint="All time"
            />
            <StatCard
              label="Pending"
              value={counts?.pending ?? 0}
              icon={Clock}
              tone="warning"
              hint="Awaiting the HOD"
            />
            <StatCard
              label="Approved"
              value={counts?.approved ?? 0}
              icon={CheckCircle2}
              tone="success"
              hint="Granted"
            />
            <StatCard
              label="Rejected"
              value={counts?.rejected ?? 0}
              icon={XCircle}
              tone="danger"
              hint="Not granted"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="min-w-0 lg:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-section-title">Recent requests</h2>
                <Link to="/student/history" className="app-link text-sm">
                  View all
                </Link>
              </div>

              {recent.length === 0 ? (
                <div className="app-card">
                  <EmptyState
                    title="No requests yet"
                    description="Apply for leave and your requests will appear here."
                    action={
                      <Button to="/student/apply">
                        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                        Apply for leave
                      </Button>
                    }
                  />
                </div>
              ) : (
                <LeaveRequestTable
                  requests={recent}
                  caption="Your most recent leave requests"
                />
              )}
            </section>

            <aside className="min-w-0 space-y-6">
              {student && (
                <section className="app-card p-5">
                  <h2 className="text-section-title">Your details</h2>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <Field label="Register number">{student.register_number}</Field>
                    <Field label="Department">{student.department}</Field>
                    <Field label="Semester">
                      {student.section
                        ? `Semester ${student.semester} · Section ${student.section}`
                        : `Semester ${student.semester}`}
                    </Field>
                    <Field label="Admission year">
                      {student.admission_year ? String(student.admission_year) : '—'}
                    </Field>
                  </dl>
                </section>
              )}

              <section className="app-card p-5">
                <h2 className="text-section-title">Next steps</h2>

                <ol className="mt-4 space-y-4">
                  <Step
                    title="Send a request"
                    text="Fill in the leave type, the dates and the reason."
                    action={
                      <Link to="/student/apply" className="app-link text-sm">
                        Apply for leave
                      </Link>
                    }
                  />
                  <Step
                    title="Wait for the HOD"
                    text="Your request is decided by the Head of Department."
                  />
                  <Step
                    title="Track it"
                    text="Every request keeps its full history."
                    action={
                      <Link to="/student/history" className="app-link text-sm">
                        My requests
                      </Link>
                    }
                  />
                </ol>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

interface StepProps {
  title: string
  text: string
  action?: ReactNode
}

/** One step of the "next steps" list on the dashboard. */
function Step({ title, text, action }: StepProps) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </li>
  )
}
