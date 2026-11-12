"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { leaveApi } from "@/src/lib/api/leaveApi";
import { documentApi } from "@/src/lib/api/documentApi";
import type { LeaveRequest, RequestHistoryEntry, DocumentRecord } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Textarea } from "@/src/components/ui/Textarea";

import { formatDateTime } from "@/src/utils/format";

export default function StudentRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [req, setReq] = useState<LeaveRequest | null>(null);
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await leaveApi.get(id);
      setReq(r);
      const h = await leaveApi.history(id);
      setHistory(h.items ?? []);
      const d = await documentApi.listForLeave(id);
      setDocs(d.items ?? []);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doAction(fn: () => Promise<LeaveRequest>) {
    setActing(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Action failed");
    } finally {
      setActing(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_type", docType);
      await documentApi.uploadForLeave(id, fd);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <EmptyState title="Error" description={error} action={<Button onClick={load}>Retry</Button>} />;
  if (!req) return <EmptyState title="Not found" />;

  const canSubmit = req.status === "draft" || req.status === "changes_requested";
  const canWithdraw = req.status === "pending" || req.status === "changes_requested" || req.status === "approved";
  const canReturn = req.status === "approved";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Request detail</h1>
        <Badge status={req.status} />
      </div>
      <div className="app-card space-y-2">
        <p><span className="font-medium">Type:</span> {req.request_type}</p>
        <p><span className="font-medium">Reason:</span> {req.reason}</p>
        {req.destination && <p><span className="font-medium">Destination:</span> {req.destination}</p>}
        <p><span className="font-medium">Start:</span> {formatDateTime(req.start_at)}</p>
        <p><span className="font-medium">End:</span> {formatDateTime(req.end_at)}</p>
        {req.decision_reason && <p><span className="font-medium">Decision reason:</span> {req.decision_reason}</p>}
        {req.completion_note && <p><span className="font-medium">Completion note:</span> {req.completion_note}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {canSubmit && (
          <Button loading={acting} onClick={() => doAction(() => leaveApi.submit(req.id, comment || undefined))}>
            Submit
          </Button>
        )}
        {canWithdraw && (
          <Button variant="destructive" loading={acting} onClick={() => setWithdrawOpen(true)}>
            Withdraw
          </Button>
        )}
        {canReturn && (
          <>
            <Button loading={acting} onClick={() => doAction(() => leaveApi.recordReturn(req.id, comment || undefined))}>
              Record return
            </Button>
            <Button
              variant="outline"
              loading={acting}
              onClick={() => doAction(() => leaveApi.complete(req.id, comment || undefined))}
            >
              Mark completed
            </Button>
          </>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Comment (optional)</label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      <div className="app-card">
        <h2 className="mb-3 text-lg font-semibold">Documents</h2>
        <form onSubmit={handleUpload} className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-sm font-medium">Type</label>
            <select
              className="ml-2 h-10 rounded-lg border border-input bg-card px-3 text-sm"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="medical_certificate">Medical certificate</option>
              <option value="event_invitation">Event invitation</option>
              <option value="registration_confirmation">Registration confirmation</option>
              <option value="participation_certificate">Participation certificate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button type="submit" loading={uploading} disabled={!file}>
            Upload
          </Button>
        </form>
        {docs.length === 0 ? (
          <EmptyState title="No documents" />
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <span>{d.original_filename}</span>
                <button
                  className="text-primary hover:underline"
                  onClick={async () => {
                    try {
                      const { blob, filename } = await documentApi.download(d.id);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = filename;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      setError((e as { message?: string })?.message ?? "Download failed");
                    }
                  }}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="app-card">
        <h2 className="mb-3 text-lg font-semibold">History</h2>
        {history.length === 0 ? (
          <EmptyState title="No history" />
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="border-b border-border pb-2">
                <p className="font-medium">
                  {h.action ?? "transition"}: {h.old_status ?? "—"} → {h.new_status}
                </p>
                {h.comment && <p className="text-muted-foreground">{h.comment}</p>}
                <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={withdrawOpen}
        title="Withdraw request?"
        description="This will mark the request as withdrawn."
        confirmLabel="Withdraw"
        destructive
        loading={acting}
        onConfirm={async () => {
          await doAction(() => leaveApi.withdraw(req.id, comment || undefined));
          setWithdrawOpen(false);
        }}
        onCancel={() => setWithdrawOpen(false)}
      />
    </div>
  );
}