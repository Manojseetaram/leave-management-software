"use client";

import React, { useEffect, useState } from "react";
import { studentApi } from "@/src/lib/api/studentApi";
import { leaveApi } from "@/src/lib/api/leaveApi";
import type { StudentRecord, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Pagination } from "@/src/components/ui/Pagination";
import { Input } from "@/src/components/ui/Input";
import { Search } from "lucide-react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import type { ParentContact } from "@/src/types";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

export default function HodStudentsPage() {
  const [data, setData] = useState<Paged<StudentRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [parents, setParents] = useState<ParentContact[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [leaveSummary, setLeaveSummary] = useState<Record<string, { days: number; onLeave: boolean }>>({});

  async function load(p = page, query = q) {
    setLoading(true);
    setError(null);
    try {
      const res = await studentApi.list({ q: query || undefined, page: p, per_page: 20 });
      setData(res);
      const today = new Date();
      const summaries = await Promise.all(
        res.items.map(async (s) => {
          try {
            const leaves = await leaveApi.list({ student_id: s.id, status: "approved", per_page: 100 });
            let days = 0;
            let onLeave = false;
            for (const lr of leaves.items ?? []) {
              const start = new Date(lr.start_at);
              const end = new Date(lr.end_at);
              const diff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
              days += diff;
              if (today >= start && today <= end) onLeave = true;
            }
            return [s.id, { days, onLeave }] as const;
          } catch {
            return [s.id, { days: 0, onLeave: false }] as const;
          }
        }),
      );
      setLeaveSummary((prev) => {
        const next = { ...prev };
        for (const [id, info] of summaries) next[id] = info;
        return next;
      });
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

  async function openDetail(s: StudentRecord) {
    setSelected(s);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await studentApi.parents(s.id);
      setParents(res.items ?? []);
    } catch (e) {
      const message = friendlyMessage(e); toast.error(message);
      setParents([]);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Students</h1>
      <div className="flex gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search students…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1, q); } }} className="pl-9" />
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
                  <th className="py-2">Leave status</th>
                  <th className="py-2">Leave days</th>
                  <th className="py-2">Actions</th>
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
                    <td className="py-2">
                      {leaveSummary[s.id]?.onLeave ? (
                        <span className="text-[#1E90FF] font-medium">On leave</span>
                      ) : (
                        <span className="text-muted-foreground">Active</span>
                      )}
                    </td>
                    <td className="py-2">{leaveSummary[s.id]?.days ?? 0}</td>
                    <td className="py-2">
                      <Button size="sm" variant="outline" onClick={() => openDetail(s)}>
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} perPage={data.per_page} total={data.total} onPageChange={setPage} />
        </>
      )}

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Student details">
        {selected && (
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Name:</span> {selected.full_name}</p>
            <p><span className="font-medium">Register number:</span> {selected.register_number}</p>
            <p><span className="font-medium">Email:</span> {selected.email ?? "—"}</p>
            <p><span className="font-medium">Department:</span> {selected.department}</p>
            <p><span className="font-medium">Semester:</span> {selected.semester}</p>
            <p><span className="font-medium">Section:</span> {selected.section ?? "—"}</p>
            <p><span className="font-medium">Admission year:</span> {selected.admission_year ?? "—"}</p>
            <p><span className="font-medium">Status:</span> {selected.status}</p>
            <h3 className="font-semibold">Parent contacts</h3>
            {detailLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : parents.length === 0 ? (
              <p className="text-muted-foreground">No parent contact linked.</p>
            ) : (
              <ul className="space-y-2">
                {parents.map((p) => (
                  <li key={p.id} className="border-b border-border pb-2">
                    <p className="font-medium">{p.full_name} ({p.relationship})</p>
                    <p className="text-muted-foreground">Phone: {p.verified_at ? "verified" : "unverified"} · Consent: {p.sms_consent_at ? "yes" : "no"}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}