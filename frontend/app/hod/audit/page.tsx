"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/src/lib/api/adminApi";
import type { AuditLogEntry, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Pagination } from "@/src/components/ui/Pagination";

export default function HodAuditPage() {
  const [data, setData] = useState<Paged<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.auditLogs({ page: p, per_page: 20 });
      setData(res);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Audit log</h1>
      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState title="Error" description={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No audit entries" />
      ) : (
        <>
          <div className="app-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">When</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Entity</th>
                  <th className="py-2">Actor</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} className="border-b border-border">
                    <td className="py-2">{e.created_at}</td>
                    <td className="py-2">{e.action}</td>
                    <td className="py-2">
                      {e.entity_type}
                      {e.entity_id ? `:${e.entity_id}` : ""}
                    </td>
                    <td className="py-2">{e.actor_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} perPage={data.per_page} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}