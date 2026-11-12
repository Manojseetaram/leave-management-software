"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { studentApi } from "@/src/lib/api/studentApi";
import type { StudentRecord } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";

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
    studentApi
      .get(studentId)
      .then(setStudent)
      .catch((e) => setError((e as { message?: string })?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <Loading />;
  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
      <div className="app-card space-y-2">
        <p><span className="font-medium">Name:</span> {user?.full_name}</p>
        <p><span className="font-medium">Email:</span> {user?.email}</p>
        {student && (
          <>
            <p><span className="font-medium">Register number:</span> {student.register_number}</p>
            <p><span className="font-medium">Department:</span> {student.department}</p>
            <p><span className="font-medium">Semester:</span> {student.semester}</p>
            <p><span className="font-medium">Section:</span> {student.section ?? "—"}</p>
            <p><span className="font-medium">Admission year:</span> {student.admission_year ?? "—"}</p>
            <p><span className="font-medium">Status:</span> {student.status}</p>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}