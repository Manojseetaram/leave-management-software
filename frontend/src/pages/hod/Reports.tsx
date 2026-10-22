import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react'

import * as hodApi from '../../api/hodApi'
import * as leaveApi from '../../api/leaveApi'

import FilterChip from '../../components/common/FilterChip'
import Pagination from '../../components/common/Pagination'
import StatCard from '../../components/common/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { useRequest } from '../../hooks/useRequest'

import { AUDIT_ENTITY_LABELS, auditActionLabel, auditEntityLabel } from '../../utils/audit'
import { formatDateTime } from '../../utils/format'
import {
  countByStatus,
  countByType,
  countNotificationsByStatus,
  notificationEventLabel,
  type CountRow,
} from '../../utils/reports'

import type { Paged } from '../../types/api'
import type { AuditLogEntry, NotificationRecord } from '../../types/hod'
import type { LeaveRequest } from '../../types/leave'

/** The backend caps `per_page` at 100 and answers with the exact total. */
const PAGE_SIZE = 100
const AUDIT_PER_PAGE = 10

/** The entity types the audit log can be filtered by. */
const AUDIT_FILTERS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'leave_request', label: AUDIT_ENTITY_LABELS.leave_request },
  { value: 'student', label: AUDIT_ENTITY_LABELS.student },
  { value: 'parent', label: AUDIT_ENTITY_LABELS.parent },
  { value: 'session', label: AUDIT_ENTITY_LABELS.session },
  { value: 'user', label: AUDIT_ENTITY_LABELS.user },
]

/** Reads every page of a list, so the totals are exact. */
async function loadAll<T>(loadPage: (page: number) => Promise<Paged<T>>): Promise<T[]> {
  const first = await loadPage(1)
  const collected = [...first.items]

  const totalPages = Math.ceil(first.total / PAGE_SIZE)
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await loadPage(page)
    collected.push(...next.items)
  }

  return collected
}

/**
 * The HOD report.
 *
 * The backend has no report endpoint, so everything on this page is counted
 * from the lists the API already returns: the leave requests, the audit log
 * and the parent SMS log.
 */
export default function Reports() {
  const [entityType, setEntityType] = useState<string | undefined>(undefined)
  const [auditPage, setAuditPage] = useState(1)

  const {
    data: requests,
    error,
    isLoading,
    reload,
  } = useRequest<LeaveRequest[]>('hod-reports-requests', () =>
    loadAll((page) => leaveApi.list({ page, per_page: PAGE_SIZE })),
  )

  const {
    data: notifications,
    error: notificationsError,
  } = useRequest<NotificationRecord[]>('hod-reports-notifications', () =>
    loadAll((page) => hodApi.notifications({ page, per_page: PAGE_SIZE })),
  )

  const {
    data: auditLog,
    error: auditError,
    isLoading: isAuditLoading,
    reload: reloadAudit,
  } = useRequest<Paged<AuditLogEntry>>(
    `hod-reports-audit:${entityType ?? 'all'}:${auditPage}`,
    () =>
      hodApi.auditLogs({
        entity_type: entityType,
        page: auditPage,
        per_page: AUDIT_PER_PAGE,
      }),
  )

  const selectEntity = (next: string | undefined) => {
    setEntityType(next)
    setAuditPage(1)
  }

  const allRequests = requests ?? []
  const statusRows = countByStatus(allRequests)
  const typeRows = countByType(allRequests)
  const notificationRows = countNotificationsByStatus(notifications ?? [])

  const countOf = (rows: CountRow[], key: string) =>
    rows.find((row) => row.key === key)?.count ?? 0

  const recentNotifications = (notifications ?? []).slice(0, 8)

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The leave totals, the audit trail and the parent messages, counted from
            the records the system holds.
          </p>
        </div>
      </header>

      {isLoading ? (
        <LoadingState label="Loading the report..." />
      ) : error ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total requests"
              value={allRequests.length}
              icon={FileText}
              hint="All leave requests"
            />
            <StatCard
              label="Awaiting a decision"
              value={countOf(statusRows, 'pending')}
              icon={Clock}
              tone="warning"
              hint="Pending requests"
            />
            <StatCard
              label="Approved"
              value={countOf(statusRows, 'approved')}
              icon={CheckCircle2}
              tone="success"
              hint="Granted"
            />
            <StatCard
              label="Rejected"
              value={countOf(statusRows, 'rejected')}
              icon={XCircle}
              tone="danger"
              hint="Not granted"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="text-section-title mb-3">Leave requests by status</h2>

              {allRequests.length === 0 ? (
                <div className="app-card">
                  <EmptyState
                    title="No leave requests yet"
                    description="The totals appear once a student sends a request."
                  />
                </div>
              ) : (
                <ReportTable
                  caption="Leave requests by status"
                  rows={statusRows}
                  rowKey={(row) => row.key}
                  columns={[
                    { header: 'Status', render: (row) => row.label },
                    {
                      header: 'Requests',
                      align: 'right',
                      render: (row) => row.count,
                    },
                  ]}
                />
              )}
            </section>

            <section>
              <h2 className="text-section-title mb-3">Leave requests by type</h2>

              {allRequests.length === 0 ? (
                <div className="app-card">
                  <EmptyState
                    title="No leave requests yet"
                    description="The totals appear once a student sends a request."
                  />
                </div>
              ) : (
                <ReportTable
                  caption="Leave requests by type"
                  rows={typeRows}
                  rowKey={(row) => row.key}
                  columns={[
                    { header: 'Type', render: (row) => row.label },
                    {
                      header: 'Requests',
                      align: 'right',
                      render: (row) => row.count,
                    },
                  ]}
                />
              )}
            </section>
          </div>

          <section className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-section-title">Audit history</h2>

              <div
                role="group"
                aria-label="Filter the audit history by record"
                className="flex flex-wrap gap-2"
              >
                {AUDIT_FILTERS.map((filter) => (
                  <FilterChip
                    key={filter.label}
                    label={filter.label}
                    active={entityType === filter.value}
                    onClick={() => selectEntity(filter.value)}
                  />
                ))}
              </div>
            </div>

            {isAuditLoading ? (
              <div className="app-card">
                <LoadingState label="Loading the audit history..." />
              </div>
            ) : auditError ? (
              <div className="app-card">
                <ErrorState message={auditError} onRetry={reloadAudit} />
              </div>
            ) : !auditLog || auditLog.items.length === 0 ? (
              <div className="app-card">
                <EmptyState
                  title="Nothing has been recorded yet"
                  description="Every action on a leave request and a student account is recorded here."
                />
              </div>
            ) : (
              <>
                <ReportTable
                  caption="Audit history"
                  rows={auditLog.items}
                  rowKey={(entry) => String(entry.id)}
                  columns={[
                    {
                      header: 'Action',
                      render: (entry) => (
                        <span className="font-medium text-foreground">
                          {auditActionLabel(entry.action)}
                        </span>
                      ),
                    },
                    { header: 'Record', render: (entry) => auditEntityLabel(entry.entity_type) },
                    {
                      header: 'When',
                      align: 'right',
                      render: (entry) => (
                        <span className="text-muted-foreground">
                          {formatDateTime(entry.created_at)}
                        </span>
                      ),
                    },
                  ]}
                />

                <div className="app-card mt-4">
                  <Pagination
                    page={auditLog.page}
                    perPage={auditLog.per_page}
                    total={auditLog.total}
                    onPageChange={setAuditPage}
                    isLoading={isAuditLoading}
                  />
                </div>
              </>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-section-title mb-3">Parent messages</h2>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Delivery status</h3>

                {notificationsError ? (
                  <div className="app-card mt-3">
                    <p role="alert" className="p-4 text-sm text-destructive">
                      The parent messages could not be loaded.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <ReportTable
                      caption="Parent messages by delivery status"
                      rows={notificationRows}
                      rowKey={(row) => row.key}
                      columns={[
                        { header: 'Status', render: (row) => row.label },
                        {
                          header: 'Messages',
                          align: 'right',
                          render: (row) => row.count,
                        },
                      ]}
                    />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent messages</h3>

                {notificationsError ? (
                  <div className="app-card mt-3">
                    <p role="alert" className="p-4 text-sm text-destructive">
                      The parent messages could not be loaded.
                    </p>
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="app-card mt-3">
                    <EmptyState
                      title="No parent messages"
                      description="A message is queued when a request is submitted or decided."
                    />
                  </div>
                ) : (
                  <div className="mt-3">
                    <ReportTable
                      caption="Recent parent messages"
                      rows={recentNotifications}
                      rowKey={(record) => record.id}
                      columns={[
                        {
                          header: 'Event',
                          render: (record) => notificationEventLabel(record.event_type),
                        },
                        {
                          header: 'Request',
                          render: (record) => (
                            <Link
                              to={`/hod/requests/${record.leave_request_id}`}
                              className="font-medium text-brand-600 hover:text-brand-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Open the request
                            </Link>
                          ),
                        },
                        { header: 'Status', render: (record) => record.status },
                        {
                          header: 'Attempts',
                          align: 'right',
                          render: (record) => record.attempt_count,
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

interface ReportColumn<T> {
  header: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
}

interface ReportTableProps<T> {
  caption: string
  columns: ReportColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
}

/** A table of report rows, in the same shape as the other tables of the app. */
function ReportTable<T>({ caption, columns, rows, rowKey }: ReportTableProps<T>) {
  return (
    <div className="app-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <caption className="sr-only">{caption}</caption>

          <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`px-4 py-3 font-medium ${
                    column.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-muted/60">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-4 py-3 text-foreground ${
                      column.align === 'right' ? 'text-right font-medium' : ''
                    }`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
