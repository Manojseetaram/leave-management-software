"use client";

import React, { useEffect, useState } from "react";
import { documentApi } from "@/src/lib/api/documentApi";
import type { DocumentRecord, Paged } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { Pagination } from "@/src/components/ui/Pagination";
import { Select } from "@/src/components/ui/Select";
import { Button } from "@/src/components/ui/Button";
import { Textarea } from "@/src/components/ui/Textarea";
import { Modal } from "@/src/components/ui/Modal";

export default function HodDocumentsPage() {
  const [data, setData] = useState<Paged<DocumentRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("unverified");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [verdict, setVerdict] = useState<"verified" | "rejected">("verified");
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);

  async function load(p = page, s = status) {
    setLoading(true);
    setError(null);
    try {
      const res = await documentApi.listReview({ verification_status: s || undefined, page: p, per_page: 20 });
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
    if (!selected) return;
    setActing(true);
    try {
      await documentApi.verify(selected.id, { status: verdict, review_notes: notes || undefined });
      setSelected(null);
      await load(page, status);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Action failed");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Documents review</h1>
      <div className="max-w-xs">
        <Select
          label="Verification status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "All" },
            { value: "unverified", label: "Unverified" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState title="Error" description={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No documents" />
      ) : (
        <>
          <div className="app-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Filename</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id} className="border-b border-border">
                    <td className="py-2">{d.original_filename}</td>
                    <td className="py-2">{d.document_type}</td>
                    <td className="py-2">
                      <Badge status={d.verification_status} />
                    </td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(d);
                          setVerdict("verified");
                          setNotes("");
                        }}
                      >
                        Review
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

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Review document"
      >
        {selected && (
          <div className="space-y-3">
            <p className="text-sm">{selected.original_filename}</p>
            <Select
              label="Decision"
              value={verdict}
              onChange={(e) => setVerdict(e.target.value as "verified" | "rejected")}
              options={[
                { value: "verified", label: "Verify" },
                { value: "rejected", label: "Reject" },
              ]}
            />
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button loading={acting} onClick={perform}>
                Submit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}