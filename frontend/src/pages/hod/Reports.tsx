import { useState } from 'react'
import { useRequest } from '../../hooks/useRequest'
import * as adminApi from '../../api/adminApi'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import Pagination from '../../components/common/Pagination'
import LeaveRequestTable from '../../components/student/LeaveRequestTable'

import { REQUEST_STATUS_LABELS, REQUEST_STATUSES, REQUEST_TYPE_LABELS } from '../../utils/leave'

import type { LeaveReportQuery } from '../../types/hod'

const PER_PAGE = 10

export default function Reports() {
  const [status, setStatus] = useState('')
  const [requestType, setRequestType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState('created_at_desc')
  const [page, setPage] = useState(1)

  const query: LeaveReportQuery = {
    page,
    per_page: PER_PAGE,
    status: status || undefined,
    request_type: requestType || undefined,
    sort,
    from: from || undefined,
    to: to || undefined,
  }

  const { data, error, isLoading, reload } = useRequest(
    `hod-reports:${status}:${requestType}:${from}:${to}:${sort}:${page}`,
    () => adminApi.leaveReport(query),
  )

  const reset = () => {
    setStatus('')
    setRequestType('')
    setFrom('')
    setTo('')
    setSort('created_at_desc')
    setPage(1)
  }

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Department leave reporting with filters and sorting.</p>
        </div>
        <Button variant="secondary" onClick={reset}>Reset filters</Button>
      </header>

      <div className="app-card mb-4 grid gap-4 p-4 md:grid-cols-5">
        <Select
          label="Status"
          value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1) }}
          options={[
            { value: '', label: 'All' },
            ...REQUEST_STATUSES.map((value) => ({ value, label: REQUEST_STATUS_LABELS[value] })),
          ]}
        />
        <Select
          label="Request type"
          value={requestType}
          onChange={(event) => { setRequestType(event.target.value); setPage(1) }}
          options={[
            { value: '', label: 'All' },
            { value: 'personal_leave', label: REQUEST_TYPE_LABELS.personal_leave },
            { value: 'medical_leave', label: REQUEST_TYPE_LABELS.medical_leave },
            { value: 'event_permission', label: REQUEST_TYPE_LABELS.event_permission },
            { value: 'other', label: REQUEST_TYPE_LABELS.other },
          ]}
        />
        <Input label="From" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1) }} />
        <Input label="To" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1) }} />
        <Select
          label="Sort"
          value={sort}
          onChange={(event) => { setSort(event.target.value); setPage(1) }}
          options={[
            { value: 'created_at_desc', label: 'Newest first' },
            { value: 'created_at_asc', label: 'Oldest first' },
            { value: 'start_at_desc', label: 'Start date, newest first' },
            { value: 'start_at_asc', label: 'Start date, oldest first' },
            { value: 'status_asc', label: 'Status, A to Z' },
            { value: 'status_desc', label: 'Status, Z to A' },
          ]}
        />
      </div>

      {isLoading ? <LoadingState label="Loading the report..." /> : error ? (
        <div className="app-card"><ErrorState message={error} onRetry={reload} /></div>
      ) : !data ? (
        <div className="app-card"><ErrorState message="The report could not be loaded." onRetry={reload} /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="app-card p-5"><p className="text-xs tracking-wide text-muted-foreground uppercase">Total</p><p className="mt-2 text-stat font-semibold text-foreground">{data.total}</p></div>
            <div className="app-card p-5"><p className="text-xs tracking-wide text-muted-foreground uppercase">Pending</p><p className="mt-2 text-stat font-semibold text-status-pending">{data.summary.pending}</p></div>
            <div className="app-card p-5"><p className="text-xs tracking-wide text-muted-foreground uppercase">Approved</p><p className="mt-2 text-stat font-semibold text-status-approved">{data.summary.approved}</p></div>
            <div className="app-card p-5"><p className="text-xs tracking-wide text-muted-foreground uppercase">Completed</p><p className="mt-2 text-stat font-semibold text-status-completed">{data.summary.completed}</p></div>
          </div>

          <section className="mt-6">
            {data.items.length === 0 ? (
              <div className="app-card"><EmptyState title="No report rows" description="Adjust the filters to see matching leave requests." /></div>
            ) : (
              <LeaveRequestTable requests={data.items} caption="Leave report rows" />
            )}
          </section>

          <div className="app-card mt-4">
            <Pagination page={page} perPage={PER_PAGE} total={data.total} onPageChange={setPage} isLoading={isLoading} />
          </div>
        </>
      )}
    </div>
  )
}
