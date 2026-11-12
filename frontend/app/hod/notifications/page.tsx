"use client";

import React, { useEffect, useState } from "react";
import { notificationApi } from "@/src/lib/api/notificationApi";
import type { NotificationDetail, NotificationRecord, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { Pagination } from "@/src/components/ui/Pagination";
import { Modal } from "@/src/components/ui/Modal";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

export default function HodNotificationsPage() {
  const [data, setData] = useState<Paged<NotificationRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<NotificationDetail | null>(null);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.list({ page: p, per_page: 20 });
      setData(res);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function openDetail(n: NotificationRecord) {
    try {
      const detail = await notificationApi.get(n.id);
      setSelected(detail);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState title="Error" description={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No notifications" />
      ) : (
        <>
          <div className="app-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Event</th>
                  <th className="py-2">Channel</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Attempts</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((n) => (
                  <tr key={n.id} className="border-b border-border">
                    <td className="py-2">{n.event_type}</td>
                    <td className="py-2">{n.channel}</td>
                    <td className="py-2">
                      <Badge status={n.status} />
                    </td>
                    <td className="py-2">{n.attempt_count}</td>
                    <td className="py-2 text-right">
                      <button className="text-primary hover:underline" onClick={() => openDetail(n)}>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} perPage={data.per_page} total={data.total} onPageChange={setPage} />
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Notification detail">
        {selected && (
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Status:</span> {selected.status}</p>
            <p><span className="font-medium">Provider message id:</span> {selected.provider_message_id ?? "—"}</p>
            <p><span className="font-medium">Last error:</span> {selected.last_error ?? "—"}</p>
            <h3 className="font-semibold">Attempts</h3>
            {selected.attempts.length === 0 ? (
              <p className="text-muted-foreground">No attempts recorded.</p>
            ) : (
              <ul className="space-y-2">
                {selected.attempts.map((a) => (
                  <li key={a.id} className="border-b border-border pb-2">
                    <p>
                      #{a.attempt_number} · {a.status}
                    </p>
                    {a.error && <p className="text-destructive">{a.error}</p>}
                    <p className="text-xs text-muted-foreground">{a.attempted_at}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}