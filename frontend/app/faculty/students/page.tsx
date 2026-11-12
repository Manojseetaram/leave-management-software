"use client";

import React, { useEffect, useState } from "react";
import { facultyApi } from "@/src/lib/api/facultyApi";
import type { FacultyStudent, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Pagination } from "@/src/components/ui/Pagination";
import { Input } from "@/src/components/ui/Input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

export default function FacultyStudentsPage() {
  const [data, setData] = useState<Paged<FacultyStudent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  async function load(p = page, query = q) {
    setLoading(true);
    setError(null);
    try {
      const res = await facultyApi.students({ q: query || undefined, page: p, per_page: 20 });
      setData(res);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Students</h1>
      <div className="flex gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search students…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                load(1, q);
              }
            }}
            className="pl-9"
          />
        </div>
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => {
            setPage(1);
            load(1, q);
          }}
        >
          Search
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState title="Error" description={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No students" />
      ) : (
        <>
          <div className="app-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Register no.</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Semester</th>
                  <th className="py-2">Section</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id} className="border-b border-border">
                    <td className="py-2">{s.register_number}</td>
                    <td className="py-2">{s.full_name}</td>
                    <td className="py-2">{s.semester}</td>
                    <td className="py-2">{s.section ?? "—"}</td>
                    <td className="py-2">{s.status}</td>
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