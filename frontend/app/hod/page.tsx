"use client";

import React, { useEffect, useState } from "react";
import { leaveApi } from "@/src/lib/api/leaveApi";
import type { LeaveRequest, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { StatCard } from "@/src/components/ui/StatCard";
import { Badge } from "@/src/components/ui/Badge";
import { FileText } from "lucide-react";
import Link from "next/link";

export default function HodDashboard() {
  const [data, setData] = useState<Paged<LeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    leaveApi
      .list({ per_page: 50 })
      .then(setData)
      .catch((e) => setError((e as { message?: string })?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <EmptyState title="Error" description={error} />;

  const items = data?.items ?? [];
  const pending = items.filter((r) => r.status === "pending").length;
  const changes = items.filter((r) => r.status === "changes_requested").length;
  const approved = items.filter((r) => r.status === "approved").length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">HOD dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending review" value={pending} icon={<FileText size={20} />} color="bg-amber-500" />
        <StatCard label="Changes requested" value={changes} icon={<FileText size={20} />} color="bg-orange-500" />
        <StatCard label="Approved" value={approved} icon={<FileText size={20} />} color="bg-green-500" />
      </div>
      <div className="app-card">
        <h2 className="mb-3 text-lg font-semibold">Recent pending</h2>
        {items.filter((r) => r.status === "pending").length === 0 ? (
          <EmptyState title="No pending requests" />
        ) : (
          <ul className="divide-y divide-border">
            {items
              .filter((r) => r.status === "pending")
              .slice(0, 8)
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{r.request_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.start_at.slice(0, 10)} – {r.end_at.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={r.status} />
                    <Link href={`/hod/leave-requests`} className="text-sm text-primary hover:underline">
                      Review
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