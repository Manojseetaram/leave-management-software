import { useRequest } from '../../hooks/useRequest'
import * as facultyApi from '../../api/facultyApi'
import StatCard from '../../components/common/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import LeaveRequestTable from '../../components/student/LeaveRequestTable'

import type { LeaveRequest } from '../../types/leave'

export default function FacultyDashboard() {
  const students = useRequest('faculty:dashboard:students', () => facultyApi.students({ per_page: 1 }))
  const pending = useRequest(
    'faculty:dashboard:pending',
    () => facultyApi.leaveRequests({ status: 'pending', per_page: 5 }),
  )

  const counts = students.data?.total ?? 0
  const pendingRequests = (pending.data?.items ?? []) as unknown as LeaveRequest[]
  const loading = students.isLoading || pending.isLoading
  const error = students.error ?? pending.error

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Faculty dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Permitted student visibility and pending requests.</p>
        </div>
      </header>

      {loading ? (
        <LoadingState label="Loading faculty data..." />
      ) : error ? (
        <div className="app-card"><ErrorState message={error} onRetry={() => { students.reload(); pending.reload() }} /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Permitted students" value={counts} hint="Within faculty scope" />
            <StatCard label="Pending requests" value={pending.data?.total ?? 0} tone="warning" hint="Awaiting HOD" />
          </div>

          <section className="mt-6">
            <h2 className="text-section-title mb-3">Pending requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="app-card"><EmptyState title="No pending requests" /></div>
            ) : (
              <LeaveRequestTable requests={pendingRequests} caption="Pending requests visible to faculty" />
            )}
          </section>
        </>
      )}
    </div>
  )
}
