"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/src/lib/api/adminApi";
import type { LeaveReport, LeaveRequest } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { Pagination } from "@/src/components/ui/Pagination";
import { Select } from "@/src/components/ui/Select";

export default function HodReportsPage() {
  const [report, setReport] = useState<LeaveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  async function load(p = page, s = status) {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.leaveReport({ status: s || undefined, page: p, per_page: 20 });
      setReport(res);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Leave report</h1>
      {report && (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="app-card"><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-semibold">{report.summary.total}</p></div>
          <div className="app-card"><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-semibold">{report.summary.pending}</p></div>
          <div className="app-card"><p className="text-sm text-muted-foreground">Approved</p><p className="text-xl font-semibold">{report.summary.approved}</p></div>
          <div className="app-card"><p className="text-sm text-muted-foreground">Completed</p><p className="text-xl font-semibold">{report.summary.completed}</p></div>
        </div>
      )}
      <div className="max-w-xs">
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "completed", label: "Completed" },
          ]}
        />
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState title="Error" description={error} />
      ) : !report || report.items.length === 0 ? (
        <EmptyState title="No data" />
      ) : (
        <>
          <div className="app-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Type</th>
                  <th className="py-2">Dates</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((r: LeaveRequest) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-2">{r.request_type}</td>
                    <td className="py-2">
                      {r.start_at.slice(0, 10)} – {r.end_at.slice(0, 10)}
                    </td>
                    <td className="py-2">
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={report.page} perPage={report.per_page} total={report.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}