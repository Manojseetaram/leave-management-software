"use client";

import React, { useEffect, useState } from "react";
import { Mail, IdCard, Building2, GraduationCap, Layers, CalendarDays } from "lucide-react";
import { useAuth } from "@/src/contexts/AuthContext";
import { studentApi } from "@/src/lib/api/studentApi";
import type { StudentRecord } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { user, studentId } = useAuth();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    studentApi
      .get(studentId)
      .then((res) => {
        if (!cancelled) setStudent(res);
      })
      .catch((e) => {
        if (cancelled) return;
        const message = friendlyMessage(e);
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Loading />
      </div>
    );
  }

  const initial = user?.full_name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <h1 className="text-center text-2xl font-semibold text-foreground sm:text-left">Profile</h1>

      {/* Header card */}
      <div className="app-card flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-900 to-gray-600 text-3xl font-semibold text-white shadow-md">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-foreground">{user?.full_name}</h2>
          <p className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
            <Mail size={16} className="shrink-0" />
            <span className="truncate">{user?.email}</span>
          </p>
        </div>
        {student?.status && (
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium capitalize text-foreground">
            {student.status}
          </span>
        )}
      </div>

      {error && (
        <EmptyState title="Could not load student details" description={error} />
      )}

      {/* Academic details */}
      {student && (
        <div className="app-card">
          <h3 className="mb-4 text-center text-lg font-semibold text-foreground sm:text-left">
            Academic details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem
              icon={<IdCard size={18} />}
              label="Register number"
              value={student.register_number}
            />
            <DetailItem
              icon={<Building2 size={18} />}
              label="Department"
              value={student.department}
            />
            <DetailItem
              icon={<GraduationCap size={18} />}
              label="Semestesssssr"
              value={student.semester}
            />
            <DetailItem icon={<Layers size={18} />} label="Section" value={student.section ?? "—"} />
            <DetailItem
              icon={<CalendarDays size={18} />}
              label="Admission year"
              value={student.admission_year ?? "—"}
            />
          </div>
        </div>
      )}

      {!student && !error && (
        <div className="app-card text-center text-sm text-muted-foreground">
          No student record is linked to this account yet.
        </div>
      )}
    </div>
  );
}