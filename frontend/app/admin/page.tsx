"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/src/lib/api/adminApi";
import type { Dashboard } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { StatCard } from "@/src/components/ui/StatCard";
import { Users, FileText, Bell, FileCheck } from "lucide-react";

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setDashboard)
      .catch((e) => setError((e as { message?: string })?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <EmptyState title="Error" description={error} />;
  if (!dashboard) return <EmptyState title="No data" />;

  const c = dashboard.counts;
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Students" value={c.total_students} icon={<Users size={20} />} color="bg-violet-700" />
        <StatCard label="Active students" value={c.active_students} icon={<Users size={20} />} color="bg-indigo-500" />
        <StatCard label="Pending requests" value={c.pending_requests} icon={<FileText size={20} />} color="bg-amber-500" />
        <StatCard label="Approved" value={c.approved_requests} icon={<FileText size={20} />} color="bg-green-500" />
        <StatCard label="Completed" value={c.completed_requests} icon={<FileText size={20} />} color="bg-teal-500" />
        <StatCard label="Unverified docs" value={c.unverified_documents} icon={<FileCheck size={20} />} color="bg-orange-500" />
        <StatCard label="Queued notifications" value={c.queued_notifications} icon={<Bell size={20} />} color="bg-slate-500" />
        <StatCard label="Failed notifications" value={c.failed_notifications} icon={<Bell size={20} />} color="bg-red-500" />
      </div>
      <div className="app-card">
        <h2 className="mb-3 text-lg font-semibold">Recent pending</h2>
        {dashboard.recent_pending.length === 0 ? (
          <EmptyState title="No pending requests" />
        ) : (
          <ul className="divide-y divide-border">
            {dashboard.recent_pending.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{r.request_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.start_at.slice(0, 10)} – {r.end_at.slice(0, 10)}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}