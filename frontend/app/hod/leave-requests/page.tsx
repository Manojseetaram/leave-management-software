"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { leaveApi } from "@/src/lib/api/leaveApi";
import { studentApi } from "@/src/lib/api/studentApi";
import { useAuth } from "@/src/contexts/AuthContext";
import type { LeaveRequest, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { Pagination } from "@/src/components/ui/Pagination";
import { Select } from "@/src/components/ui/Select";
import { Button } from "@/src/components/ui/Button";
import { Textarea } from "@/src/components/ui/Textarea";
import { Modal } from "@/src/components/ui/Modal";
import { formatDateTime } from "@/src/utils/format";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

type LeaveAction = "approve" | "reject" | "changes";

const ACTION_TITLES: Record<LeaveAction, string> = {
  approve: "Approve request",
  reject: "Reject request",
  changes: "Request changes",
};

const ACTION_SUCCESS: Record<LeaveAction, string> = {
  approve: "Leave request approved.",
  reject: "Leave request rejected.",
  changes: "Changes requested.",
};

export default function HodLeaveQueuePage() {
  const { roles } = useAuth();
  const canDecide = roles.includes("hod");

  const [data, setData] = useState<Paged<LeaveRequest> | null>(null);
  const [studentMap, setStudentMap] = useState<Record<string, { full_name: string; register_number: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("pending");
  const [studentQuery, setStudentQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [action, setAction] = useState<LeaveAction | null>(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);
  const [leaveSummary, setLeaveSummary] = useState<{ days: number; onLeave: boolean } | null>(null);

  // Used to ignore responses from outdated requests
  const requestId = useRef(0);

  const load = useCallback(async (p: number, s: string) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await leaveApi.list({ status: s || undefined, page: p, per_page: 20 });
      if (id !== requestId.current) return;
      setData(res);
      const ids = Array.from(new Set(res.items.map((r) => r.student_id)));
      const missing = ids.filter((sid) => !studentMap[sid]);
      if (missing.length) {
        const entries = await Promise.all(
          missing.map(async (sid) => {
            try {
              const st = await studentApi.get(sid);
              return [sid, { full_name: st.full_name, register_number: st.register_number }] as const;
            } catch {
              return [sid, { full_name: "Unknown student", register_number: "—" }] as const;
            }
          }),
        );
        if (id !== requestId.current) return;
        setStudentMap((prev) => {
          const next = { ...prev };
          for (const [sid, info] of entries) next[sid] = info;
          return next;
        });
      }
    } catch (e) {
      if (id !== requestId.current) return;
      const message = friendlyMessage(e);
      setError(message);
      toast.error(message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [studentMap]);

  useEffect(() => {
    load(page, status);
  }, [load, page, status]);

  function openAction(request: LeaveRequest, nextAction: LeaveAction) {
    setSelected(request);
    setAction(nextAction);
    setComment("");
    setLeaveSummary(null);
    leaveApi
      .list({ student_id: request.student_id, status: "approved", per_page: 100 })
      .then((res) => {
        const today = new Date();
        let days = 0;
        let onLeave = false;
        for (const lr of res.items ?? []) {
          const start = new Date(lr.start_at);
          const end = new Date(lr.end_at);
          days += Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          if (today >= start && today <= end) onLeave = true;
        }
        setLeaveSummary({ days, onLeave });
      })
      .catch(() => setLeaveSummary({ days: 0, onLeave: false }));
  }

  function closeModal() {
    if (acting) return;
    setSelected(null);
    setAction(null);
    setComment("");
  }

  const commentRequired = action === "reject" || action === "changes";
  const trimmedComment = comment.trim();

  async function perform() {
    if (!selected || !action) return;
    if (commentRequired && !trimmedComment) return;

    setActing(true);
    try {
      if (action === "approve") {
        await leaveApi.approve(selected.id, trimmedComment || undefined);
      } else if (action === "reject") {
        await leaveApi.reject(selected.id, trimmedComment);
      } else {
        await leaveApi.requestChanges(selected.id, trimmedComment);
      }

      toast.success(ACTION_SUCCESS[action]);
      setSelected(null);
      setAction(null);
      setComment("");
      await load(page, status);
    } catch (e) {
      // Keep the modal open and the table visible so the user can retry
      toast.error(friendlyMessage(e));
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Leave queue</h1>

      <div className="flex flex-wrap gap-3">
        <div className="max-w-xs flex-1">
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
              { value: "changes_requested", label: "Changes requested" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
        </div>
        <div className="max-w-xs flex-1">
          <label className="text-sm font-medium text-foreground">Student</label>
          <div className="relative">
            <input
              type="search"
              placeholder="Filter by student…"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 pl-9 text-sm"
            />
          </div>
        </div>
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
                  <th className="py-2">Type</th>
                  <th className="py-2">Dates</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items
                  .filter((r) => {
                    if (!studentQuery.trim()) return true;
                    const info = studentMap[r.student_id];
                    const q = studentQuery.toLowerCase();
                    return (
                      info?.full_name?.toLowerCase().includes(q) ||
                      info?.register_number?.toLowerCase().includes(q) ||
                      r.request_type.toLowerCase().includes(q)
                    );
                  })
                  .map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-2">
                      <div className="font-medium">{studentMap[r.student_id]?.full_name ?? "Loading…"}</div>
                      <div className="text-xs text-muted-foreground">{studentMap[r.student_id]?.register_number ?? ""}</div>
                    </td>
                    <td className="py-2">{r.request_type}</td>
                    <td className="py-2">
                      {r.start_at.slice(0, 10)} – {r.end_at.slice(0, 10)}
                    </td>
                    <td className="py-2">
                      <Badge status={r.status} />
                    </td>
                    <td className="py-2">
                      {canDecide && (r.status === "pending" || r.status === "changes_requested") ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => openAction(r, "approve")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openAction(r, "reject")}>
                            Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAction(r, "changes")}>
                            Request changes
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page}
            perPage={data.per_page}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={!!selected && !!action}
        onClose={closeModal}
        title={action ? ACTION_TITLES[action] : ""}
      >
        {selected && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selected.request_type} · {formatDateTime(selected.start_at)} –{" "}
              {formatDateTime(selected.end_at)}
            </p>
            {leaveSummary && (
              <p className="text-xs text-muted-foreground">
                Student leave history: {leaveSummary.days} approved days used
                {leaveSummary.onLeave ? " · currently on leave" : ""}
              </p>
            )}

            <Textarea
              label="Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required={commentRequired}
              rows={4}
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal} disabled={acting}>
                Cancel
              </Button>
              <Button
                loading={acting}
                disabled={acting || (commentRequired && !trimmedComment)}
                variant={action === "reject" ? "destructive" : "primary"}
                onClick={perform}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}