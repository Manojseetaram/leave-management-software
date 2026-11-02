import { useState } from 'react'
import { useRequest } from '../../hooks/useRequest'
import * as adminApi from '../../api/adminApi'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { formatDateTime } from '../../utils/format'

const PER_PAGE = 10

export default function Audit() {
  const [entityType, setEntityType] = useState('')
  const [page, setPage] = useState(1)

  const { data, error, isLoading, reload } = useRequest(
    `admin:audit:${entityType}:${page}`,
    () => adminApi.auditLogs({ entity_type: entityType || undefined, page, per_page: PER_PAGE }),
  )

  const entries = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Audit log</h1>
          <p className="mt-1 text-sm text-muted-foreground">Security-relevant actions across the system.</p>
        </div>
      </header>

      <div className="app-card mb-4 grid gap-4 p-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Entity type</span>
          <input value={entityType} onChange={(event) => { setEntityType(event.target.value); setPage(1) }} placeholder="leave_request" className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
      </div>

      {isLoading ? (
        <LoadingState label="Loading audit entries..." />
      ) : error ? (
        <div className="app-card"><ErrorState message={error} onRetry={reload} /></div>
      ) : entries.length === 0 ? (
        <div className="app-card"><EmptyState title="No audit entries" /></div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(entry.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{entry.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.entity_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.actor_id ?? 'system'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3">
            <Pagination page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  )
}
