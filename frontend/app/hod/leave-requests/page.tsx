"use client";

import React, { useEffect, useState } from "react";
import { leaveApi } from "@/src/lib/api/leaveApi";
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

export default function HodLeaveQueuePage() {
  const [data, setData] = useState<Paged<LeaveRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "changes" | null>(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);

  async function load(p = page, s = status) {
    setLoading(true);
    setError(null);
    try {
      const res = await leaveApi.list({ status: s || undefined, page: p, per_page: 20 });
      setData(res);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function perform() {
    if (!selected || !action) return;
    setActing(true);
    try {
      if (action === "approve") await leaveApi.approve(selected.id, comment || undefined);
      else if (action === "reject") await leaveApi.reject(selected.id, comment);
      else if (action === "changes") await leaveApi.requestChanges(selected.id, comment);
      setSelected(null);
      setAction(null);
      setComment("");
      await load(page, status);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Action failed");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Leave queue</h1>
      <div className="max-w-xs">
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
      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState title="Error" description={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No requests" />
      ) : (
        <>
          <div className="app-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Type</th>
                  <th className="py-2">Dates</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-2">{r.request_type}</td>
                    <td className="py-2">
                      {r.start_at.slice(0, 10)} – {r.end_at.slice(0, 10)}
                    </td>
                    <td className="py-2">
                      <Badge status={r.status} />
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelected(r);
                            setAction("approve");
                            setComment("");
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelected(r);
                            setAction("reject");
                            setComment("");
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(r);
                            setAction("changes");
                            setComment("");
                          }}
                        >
                          Request changes
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} perPage={data.per_page} total={data.total} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={!!selected && !!action}
        onClose={() => {
          setSelected(null);
          setAction(null);
        }}
        title={
          action === "approve"
            ? "Approve request"
            : action === "reject"
              ? "Reject request"
              : "Request changes"
        }
      >
        {selected && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selected.request_type} · {formatDateTime(selected.start_at)} – {formatDateTime(selected.end_at)}
            </p>
            <Textarea
              label="Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required={action === "reject" || action === "changes"}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                loading={acting}
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