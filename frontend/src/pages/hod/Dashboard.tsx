import { Link } from 'react-router-dom'
import { Award, ClipboardList, FileText, Users } from 'lucide-react'

import * as adminApi from '../../api/adminApi'
import * as leaveApi from '../../api/leaveApi'
import Button from '../../components/common/Button'
import StatCard from '../../components/common/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import LeaveRequestTable from '../../components/student/LeaveRequestTable'

import { useRequest } from '../../hooks/useRequest'

export default function Dashboard() {
  const dashboardRequest = useRequest('admin-dashboard', adminApi.dashboard)
  const pendingRequest = useRequest('admin:pending:1', () => leaveApi.list({ status: 'pending', per_page: 1 }))

  const dashboard = dashboardRequest.data
  const counts = dashboard?.counts
  const recentPending = dashboard?.recent_pending ?? []
  const pendingTotal = pendingRequest.data?.total ?? 0

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Department-wide leave, evidence and notification status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button to="/hod/students">Manage students</Button>
          <Button to="/hod/reports">Open reports</Button>
          <Button to="/hod/certificates">Review certificates</Button>
        </div>
      </header>

      {dashboardRequest.isLoading ? (
        <LoadingState label="Loading the department dashboard..." />
      ) : dashboardRequest.error ? (
        <div className="app-card">
          <ErrorState message={dashboardRequest.error} onRetry={dashboardRequest.reload} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Students" value={counts?.total_students ?? 0} icon={Users} hint={`${counts?.active_students ?? 0} active`} />
            <StatCard label="Pending requests" value={pendingTotal} icon={ClipboardList} tone="warning" hint="Awaiting HOD approval" />
            <StatCard label="Approved" value={counts?.approved_requests ?? 0} icon={FileText} tone="success" hint="Including completed" />
            <StatCard label="Unverified evidence" value={counts?.unverified_documents ?? 0} icon={Award} tone="info" hint="Awaiting verification" />
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-section-title">Newest pending requests</h2>
              <Link
                to="/hod/requests?status=pending"
                className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View queue
              </Link>
            </div>

            {recentPending.length === 0 ? (
              <div className="app-card">
                <EmptyState
                  title="No pending requests"
                  description="New student requests will appear here for review."
                />
              </div>
            ) : (
              <LeaveRequestTable requests={recentPending} caption="Newest pending leave requests" />
            )}
          </section>
        </>
      )}
    </div>
  )
}
