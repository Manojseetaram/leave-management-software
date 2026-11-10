"use client";

import React, { useEffect, useState } from "react";
import { leaveApi } from "@/src/lib/api/leaveApi";
import type { LeaveRequest, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { StatCard } from "@/src/components/ui/StatCard";
import { FileText } from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const [data, setData] = useState<Paged<LeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await leaveApi.list({ per_page: 50 });
      setData(res);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loading />;
  if (error) return <EmptyState title="Error" description={error} />;
  const items = data?.items ?? [];
  const pending = items.filter((r) => r.status === "pending" || r.status === "changes_requested").length;
  const approved = items.filter((r) => r.status === "approved").length;
  const completed = items.filter((r) => r.status === "completed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">My dashboard</h1>
        <Link href="/student/requests/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          New request
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending" value={pending} icon={<FileText size={20} />} color="bg-amber-500" />
        <StatCard label="Approved" value={approved} icon={<FileText size={20} />} color="bg-green-500" />
        <StatCard label="Completed" value={completed} icon={<FileText size={20} />} color="bg-teal-500" />
      </div>
      <div className="app-card">
        <h2 className="mb-4 text-lg font-semibold">Recent requests</h2>
        {items.length === 0 ? (
          <EmptyState title="No requests yet" description="Create your first leave or permission request." />
        ) : (
          <ul className="divide-y divide-border">
            {items.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">{r.request_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.start_at.slice(0, 10)} – {r.end_at.slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
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