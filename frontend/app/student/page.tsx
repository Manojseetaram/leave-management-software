"use client";

import React, { useCallback, useEffect, useState } from "react";
import { leaveApi } from "@/src/lib/api/leaveApi";
import type { LeaveRequest, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { StatCard } from "@/src/components/ui/StatCard";
import { FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

export default function StudentDashboard() {
  const [data, setData] = useState<Paged<LeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leaveApi.list({ per_page: 50 });
      setData(res);
    } catch (e) {
      const message = friendlyMessage(e);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <EmptyState title="Error" description={error} />
      </div>
    );
  }

  const items = data?.items ?? [];
  const pending = items.filter((r) => r.status === "pending" || r.status === "changes_requested").length;
  const approved = items.filter((r) => r.status === "approved").length;
  const completed = items.filter((r) => r.status === "completed").length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <h1 className="text-2xl font-semibold text-foreground">My dashboard</h1>
        <Link
          href="/student/requests/new"
          className="w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground sm:w-auto"
        >
          New leave / permission request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Pending" value={pending} icon={<FileText size={20} />} color="bg-amber-500" />
        <StatCard label="Approved" value={approved} icon={<FileText size={20} />} color="bg-green-500" />
        <StatCard label="Completed" value={completed} icon={<FileText size={20} />} color="bg-teal-500" />
      </div>

      {/* Recent requests */}
      <div className="app-card">
        <h2 className="mb-4 text-center text-lg font-semibold sm:text-left">Recent requests</h2>
        {items.length === 0 ? (
          <EmptyState title="No requests yet" description="Create your first leave or permission request." />
        ) : (
          <ul className="divide-y divide-border">
            {items.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{r.request_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.start_at.slice(0, 10)} – {r.end_at.slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <Badge status={r.status} />
                  <Link href={`/student/requests/${r.id}`} className="text-sm text-primary hover:underline">
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}