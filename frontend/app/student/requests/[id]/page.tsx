"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileText,
  History as HistoryIcon,
  MapPin,
  Upload,
} from "lucide-react";
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
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

function humanize(value?: string | null) {
  if (!value) return "—";
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 text-center ${className}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(
    async (initial = false) => {
      if (initial) {
        setLoading(true);
        setError(null);
      }
      try {
        const [r, h, d] = await Promise.all([
          leaveApi.get(id),
          leaveApi.history(id),
          documentApi.listForLeave(id),
        ]);
        setReq(r);
        setHistory(h.items ?? []);
        setDocs(d.items ?? []);
      } catch (e) {
        const message = friendlyMessage(e);
        if (initial) setError(message);
        toast.error(message);
      } finally {
        if (initial) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  async function doAction(fn: () => Promise<LeaveRequest>, successMessage: string) {
    setActing(true);
    try {
      await fn();
      toast.success(successMessage);
      setComment("");
      await load();
      return true;
    } catch (e) {
      toast.error(friendlyMessage(e));
      return false;
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
      toast.success("Document uploaded.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      toast.error(friendlyMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(d: DocumentRecord) {
    try {
      const { blob, filename } = await documentApi.download(d.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(friendlyMessage(err));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <EmptyState
          title="Error"
          description={error}
          action={<Button onClick={() => load(true)}>Retry</Button>}
        />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <EmptyState title="Not found" />
      </div>
    );
  }

  const canSubmit = req.status === "draft" || req.status === "changes_requested";
  const canWithdraw =
    req.status === "pending" || req.status === "changes_requested" || req.status === "approved";
  const canReturn = req.status === "approved";
  const hasActions = canSubmit || canWithdraw || canReturn;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 text-center sm:p-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/student/requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to requests
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Request detail</h1>
        <Badge status={req.status} />
      </div>

      {/* Details */}
      <div className="app-card">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Type">{humanize(req.request_type)}</Field>
          {req.destination && (
            <Field label="Destination">
              <span className="inline-flex items-center justify-center gap-1.5">
                <MapPin size={14} className="shrink-0 text-muted-foreground" />
                {req.destination}
              </span>
            </Field>
          )}
          <Field label="Start">
            <span className="inline-flex items-center justify-center gap-1.5">
              <CalendarClock size={14} className="shrink-0 text-muted-foreground" />
              {formatDateTime(req.start_at)}
            </span>
          </Field>
          <Field label="End">
            <span className="inline-flex items-center justify-center gap-1.5">
              <CalendarClock size={14} className="shrink-0 text-muted-foreground" />
              {formatDateTime(req.end_at)}
            </span>
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <span className="whitespace-pre-wrap">{req.reason}</span>
          </Field>
          {req.decision_reason && (
            <Field label="Decision reason" className="sm:col-span-2">
              <span className="whitespace-pre-wrap">{req.decision_reason}</span>
            </Field>
          )}
          {req.completion_note && (
            <Field label="Completion note" className="sm:col-span-2">
              <span className="whitespace-pre-wrap">{req.completion_note}</span>
            </Field>
          )}
        </div>
      </div>

      {/* Actions */}
      {hasActions && (
        <div className="app-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Actions</h2>
          <div className="text-left">
            <Textarea
              label="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
            {canSubmit && (
              <Button
                className="w-full sm:w-auto"
                loading={acting}
                disabled={acting}
                onClick={() =>
                  doAction(() => leaveApi.submit(req.id, comment.trim() || undefined), "Request submitted.")
                }
              >
                Submit
              </Button>
            )}
            {canReturn && (
              <>
                <Button
                  className="w-full sm:w-auto"
                  loading={acting}
                  disabled={acting}
                  onClick={() =>
                    doAction(
                      () => leaveApi.recordReturn(req.id, comment.trim() || undefined),
                      "Return recorded.",
                    )
                  }
                >
                  Record return
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  loading={acting}
                  disabled={acting}
                  onClick={() =>
                    doAction(
                      () => leaveApi.complete(req.id, comment.trim() || undefined),
                      "Request marked as completed.",
                    )
                  }
                >
                  Mark completed
                </Button>
              </>
            )}
            {canWithdraw && (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={acting}
                onClick={() => setWithdrawOpen(true)}
              >
                Withdraw
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="app-card">
        <h2 className="mb-4 text-lg font-semibold">Documents</h2>

        <form
          onSubmit={handleUpload}
          className="mb-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-4 sm:flex-row"
        >
          <select
            aria-label="Document type"
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm sm:w-56"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="medical_certificate">Medical certificate</option>
            <option value="event_invitation">Event invitation</option>
            <option value="registration_confirmation">Registration confirmation</option>
            <option value="participation_certificate">Participation certificate</option>
            <option value="other">Other</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full min-w-0 text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground sm:w-auto sm:flex-1"
          />
          <Button
            type="submit"
            className="w-full sm:w-auto"
            loading={uploading}
            disabled={!file || uploading}
          >
            <span className="inline-flex items-center gap-2">
              <Upload size={16} />
              Upload
            </span>
          </Button>
        </form>

        {docs.length === 0 ? (
          <EmptyState title="No documents" />
        ) : (
          <ul className="divide-y divide-border text-left">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={18} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.original_filename}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDownload(d)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-primary hover:bg-muted"
                >
                  <Download size={16} />
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* History */}
      <div className="app-card">
        <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold">
          <HistoryIcon size={18} />
          History
        </h2>
        {history.length === 0 ? (
          <EmptyState title="No history" />
        ) : (
          <ol className="relative mx-auto max-w-md space-y-5 border-l border-border pl-5 text-left">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {humanize(h.action ?? "transition")}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {humanize(h.old_status)} → {humanize(h.new_status)}
                  </span>
                </p>
                {h.comment && <p className="mt-0.5 text-sm text-muted-foreground">{h.comment}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
              </li>
            ))}
          </ol>
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
          const ok = await doAction(
            () => leaveApi.withdraw(req.id, comment.trim() || undefined),
            "Request withdrawn.",
          );
          if (ok) setWithdrawOpen(false);
        }}
        onCancel={() => setWithdrawOpen(false)}
      />
    </div>
  );
}