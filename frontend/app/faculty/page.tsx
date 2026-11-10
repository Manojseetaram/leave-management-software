"use client";

import React, { useEffect, useState } from "react";
import { facultyApi } from "@/src/lib/api/facultyApi";
import type { FacultyStudent, FacultyLeaveRequest, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { StatCard } from "@/src/components/ui/StatCard";
import { Badge } from "@/src/components/ui/Badge";
import { Users, FileText } from "lucide-react";
import Link from "next/link";

export default function FacultyDashboard() {
  const [students, setStudents] = useState<FacultyStudent[]>([]);
  const [leaves, setLeaves] = useState<Paged<FacultyLeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      facultyApi.students({ per_page: 50 }).then((r) => setStudents(r.items ?? [])),
      facultyApi.leaveRequests({ per_page: 50 }).then(setLeaves),
    ])
      .catch((e) => setError((e as { message?: string })?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <EmptyState title="Error" description={error} />;

  const pending = (leaves?.items ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Faculty dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="My students" value={students.length} icon={<Users size={20} />} color="bg-teal-500" />
        <StatCard label="Pending requests" value={pending} icon={<FileText size={20} />} color="bg-amber-500" />
      </div>
      <div className="app-card">
        <h2 className="mb-3 text-lg font-semibold">Recent leave requests</h2>
        {(leaves?.items ?? []).length === 0 ? (
          <EmptyState title="No requests" />
        ) : (
          <ul className="divide-y divide-border">
            {(leaves?.items ?? []).slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{r.student_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.request_type} · {r.start_at.slice(0, 10)}
                  </p>
                </div>
                <Badge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <Link href="/faculty/students" className="text-primary hover:underline">View students</Link>
        {" · "}
        <Link href="/faculty/leave-requests" className="text-primary hover:underline">View leave requests</Link>
      </div>
    </div>
  );
}