"use client";

import React, { useEffect, useState } from "react";
import { facultyApi } from "@/src/lib/api/facultyApi";
import type { FacultyLeaveRequest, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { Pagination } from "@/src/components/ui/Pagination";
import { Select } from "@/src/components/ui/Select";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

export default function FacultyLeaveRequestsPage() {
  const [data, setData] = useState<Paged<FacultyLeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  async function load(p = page, s = status) {
    setLoading(true);
    setError(null);
    try {
      const res = await facultyApi.leaveRequests({ status: s || undefined, page: p, per_page: 20 });
      setData(res);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Leave requests</h1>
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
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No requests" />
      ) : (
        <>
          <div className="app-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Student</th>
                  <th className="py-2">Register no.</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Dates</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-2">{r.student_name}</td>
                    <td className="py-2">{r.register_number}</td>
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
          <Pagination page={data.page} perPage={data.per_page} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}