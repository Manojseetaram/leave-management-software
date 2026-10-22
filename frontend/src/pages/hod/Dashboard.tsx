import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, Users, XCircle } from 'lucide-react'

import * as hodApi from '../../api/hodApi'
import * as leaveApi from '../../api/leaveApi'
import * as studentApi from '../../api/studentApi'

import Button from '../../components/common/Button'
import LeaveRequestTable from '../../components/common/LeaveRequestTable'
import StatCard from '../../components/common/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { useAuth } from '../../context/useAuth'
import { useRequest } from '../../hooks/useRequest'
import { useStudentDirectory } from '../../hooks/useStudentDirectory'

import { auditActionLabel, auditEntityLabel } from '../../utils/audit'
import { formatDateTime } from '../../utils/format'

import type { AuditLogEntry } from '../../types/hod'
import type { LeaveRequest } from '../../types/leave'

const QUEUE_SIZE = 5
const ACTIVITY_SIZE = 6

interface DashboardData {
  counts: {
    pending: number
    approved: number
    rejected: number
    students: number
  }
  queue: LeaveRequest[]
}

/**
 * The HOD opens on the requests that are waiting for a decision. The numbers
 * are exact — every status is counted with its own query — so a card never
 * shows a page of rows instead of a total.
 */
export default function Dashboard() {
  const { user } = useAuth()

  // The leave request carries a student id but no name, so the roster is
  // read alongside the queue to put a name on every row.
  const directory = useStudentDirectory()

  const { data, error, isLoading, reload } = useRequest<DashboardData>(
    'hod-dashboard',
    async () => {
      const [pending, approved, rejected, students, queue] = await Promise.all([
        leaveApi.list({ status: 'pending', per_page: 1 }),
        leaveApi.list({ status: 'approved', per_page: 1 }),
        leaveApi.list({ status: 'rejected', per_page: 1 }),
        studentApi.list({ per_page: 1 }),
        leaveApi.list({ status: 'pending', per_page: QUEUE_SIZE }),
      ])

      return {
        counts: {
          pending: pending.total,
          approved: approved.total,
          rejected: rejected.total,
          students: students.total,
        },
        queue: queue.items,
      }
    },
  )

  // The audit log is context, not the dashboard itself: a failure here must
  // not hide the counts and the queue.
  const { data: activity, error: activityError } = useRequest<AuditLogEntry[]>(
    'hod-dashboard-activity',
    async () => {
      const response = await hodApi.auditLogs({ per_page: ACTIVITY_SIZE })
      return response.items
    },
  )

  const counts = data?.counts
  const queue = data?.queue ?? []

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user
              ? `Welcome back, ${user.full_name}`
              : 'The leave requests that need your attention'}
          </p>
        </div>

        <Button to="/hod/requests">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Review the requests
        </Button>
      </header>

      {isLoading ? (
        <LoadingState label="Loading the dashboard..." />
      ) : error ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Waiting for a decision"
              value={counts?.pending ?? 0}
              icon={Clock}
              tone="warning"
              hint="Pending requests"
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
            <StatCard
              label="Students"
              value={counts?.students ?? 0}
              icon={Users}
              tone="info"
              hint="Archived accounts are hidden"
            />
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-section-title">Waiting for your decision</h2>
              <Link
                to="/hod/requests"
                className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View all
              </Link>
            </div>

            {queue.length === 0 ? (
              <div className="app-card">
                <EmptyState
                  title="Nothing is waiting for you"
                  description="Every request has been reviewed. New submissions show up here."
                />
              </div>
            ) : (
              <LeaveRequestTable
                requests={queue}
                caption="Requests waiting for a decision"
                linkBase="/hod/requests"
                student={(request) =>
                  directory.isLoading ? undefined : directory.label(request.student_id)
                }
              />
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-section-title mb-3">Recent activity</h2>

            {activityError ? (
              <div className="app-card">
                <p role="alert" className="p-4 text-sm text-destructive">
                  The activity log could not be loaded.
                </p>
              </div>
            ) : !activity || activity.length === 0 ? (
              <div className="app-card">
                <EmptyState
                  title="No activity yet"
                  description="Every action on a leave request and a student account is recorded here."
                />
              </div>
            ) : (
              <ul className="app-card divide-y divide-border">
                {activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {entry.entity_type === 'leave_request' && entry.entity_id ? (
                          <Link
                            to={`/hod/requests/${entry.entity_id}`}
                            className="hover:text-brand-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {auditActionLabel(entry.action)}
                          </Link>
                        ) : (
                          auditActionLabel(entry.action)
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {auditEntityLabel(entry.entity_type)}
                      </p>
                    </div>

                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
