import { Link } from 'react-router-dom'
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
} from 'lucide-react'

import * as leaveApi from '../../api/leaveApi'
import * as studentApi from '../../api/studentApi'

import Button from '../../components/common/Button'
import StatCard from '../../components/common/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import LeaveRequestTable from '../../components/student/LeaveRequestTable'

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
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user ? `Welcome back, ${user.full_name}` : 'Your leave requests at a glance'}
            {student && ` · ${student.register_number}`}
          </p>
        </div>

        <Button to="/student/apply">
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Apply for leave
        </Button>
      </header>

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

          {student && (
            <section className="mt-6">
              <h2 className="text-section-title mb-3">Your details</h2>
              <div className="app-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Register number" value={student.register_number} />
                <Detail label="Department" value={student.department} />
                <Detail
                  label="Semester"
                  value={
                    student.section
                      ? `Semester ${student.semester} · Section ${student.section}`
                      : `Semester ${student.semester}`
                  }
                />
                <Detail
                  label="Admission year"
                  value={student.admission_year ? String(student.admission_year) : '—'}
                />
              </div>
            </section>
          )}

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-section-title">Recent requests</h2>
              <Link
                to="/student/history"
                className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View all
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="app-card">
                <EmptyState
                  title="No requests yet"
                  description="Apply for leave and your requests will appear here."
                  action={<Button to="/student/apply">Apply for leave</Button>}
                />
              </div>
            ) : (
              <LeaveRequestTable
                requests={recent}
                caption="Your most recent leave requests"
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}

interface DetailProps {
  label: string
  value: string
}

function Detail({ label, value }: DetailProps) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
