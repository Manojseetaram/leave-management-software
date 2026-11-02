import { useState } from 'react'
import { useRequest } from '../../hooks/useRequest'
import * as hodApi from '../../api/hodApi'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import { formatDateTime } from '../../utils/format'

import type { NotificationDetail } from '../../types/hod'

const PER_PAGE = 10

export default function Notifications() {
  const [status, setStatus] = useState('')
  const [eventType, setEventType] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, error, isLoading, reload } = useRequest(
    `admin:notifications:${status}:${eventType}:${page}`,
    () =>
      hodApi.notifications({
        status: status || undefined,
        event_type: eventType || undefined,
        page,
        per_page: PER_PAGE,
      }),
  )

  const selectedKey = selectedId ?? 'none'
  const { data: detail, isLoading: detailLoading, error: detailError, reload: reloadDetail } = useRequest<NotificationDetail | null>(
    `admin:notifications:${selectedKey}`,
    async () => {
      if (!selectedId) throw new Error('The notification could not be loaded.')
      return hodApi.notificationDetail(selectedId)
    },
  )

  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Parent SMS delivery attempts and history.</p>
        </div>
      </header>

      <div className="app-card mb-4 grid gap-4 p-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">All</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Event type</span>
          <input value={eventType} onChange={(event) => { setEventType(event.target.value); setPage(1) }} placeholder="request_submitted" className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <Button variant="secondary" onClick={() => { setStatus(''); setEventType(''); setPage(1) }}>Reset</Button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading notifications..." />
      ) : error ? (
        <div className="app-card"><ErrorState message={error} onRetry={reload} /></div>
      ) : items.length === 0 ? (
        <div className="app-card"><EmptyState title="No notifications" /></div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Provider ID</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((notification) => (
                  <tr key={notification.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{notification.event_type}</td>
                    <td className="px-4 py-3"><span className="capitalize">{notification.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{notification.attempt_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{notification.provider_message_id ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(notification.sent_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedId(notification.id)}>Details</Button>
                    </td>
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

      <Modal isOpen={selectedId !== null} title="Notification delivery" onClose={() => setSelectedId(null)}>
        {selectedId ? (
          detailLoading ? <LoadingState label="Loading the notification..." /> : detailError ? (
            <ErrorState message={detailError} onRetry={reloadDetail} />
          ) : detail ? (
            <div className="space-y-3">
              <p><strong>Event:</strong> {detail.event_type}</p>
              <p><strong>Status:</strong> {detail.status}</p>
              <p><strong>Attempts:</strong> {detail.attempts.length}</p>
              {detail.attempts.length > 0 ? (
                <ul className="space-y-2">
                  {detail.attempts.map((attempt) => (
                    <li key={attempt.id} className="rounded-lg border border-border p-3 text-sm">
                      <p>#{attempt.attempt_number} · {attempt.status}</p>
                      {attempt.error ? <p className="text-muted-foreground">{attempt.error}</p> : null}
                      <p className="text-xs text-muted-foreground">{formatDateTime(attempt.attempted_at)}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null
        ) : null}
      </Modal>
    </div>
  )
}
