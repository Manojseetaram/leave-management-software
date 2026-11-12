"use client";

import React, { useEffect, useState } from "react";
import { studentApi } from "@/src/lib/api/studentApi";
import type { BulkImportResult, CreatedStudent, NewStudent, Paged, StudentRecord } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Pagination } from "@/src/components/ui/Pagination";
import { Input } from "@/src/components/ui/Input";
import { Select } from "@/src/components/ui/Select";
import { Textarea } from "@/src/components/ui/Textarea";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { Search } from "lucide-react";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

export default function AdminStudentsPage() {
  const [data, setData] = useState<Paged<StudentRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    register_number: "",
    full_name: "",
    email: "",
    semester: "1",
    section: "",
    admission_year: "",
    parent_phone: "",
    parent_name: "",
  });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedStudent | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importRows, setImportRows] = useState<NewStudent[]>([]);
  const [importDryRun, setImportDryRun] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const [target, setTarget] = useState<StudentRecord | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [acting, setActing] = useState(false);

  async function load(p = page, query = q, st = status) {
    setLoading(true);
    setError(null);
    try {
      const res = await studentApi.list({
        q: query || undefined,
        status: st || undefined,
        page: p,
        per_page: 20,
      });
      setData(res);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, q, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.parent_phone.trim()) {
      setError("Parent phone is required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await studentApi.create({
        register_number: form.register_number,
        full_name: form.full_name,
        email: form.email || null,
        semester: Number(form.semester),
        section: form.section || null,
        admission_year: form.admission_year ? Number(form.admission_year) : null,
        parent_name: form.parent_name.trim() || null,
        parent_phone: form.parent_phone.trim() || null,
      });
      setCreated(res);
      setCreateOpen(false);
      toast.success("Student created successfully.");
      setForm({
        register_number: "",
        full_name: "",
        email: "",
        semester: "1",
        section: "",
        admission_year: "",
        parent_phone: "",
        parent_name: "",
      });
      await load(page, q, status);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    } finally {
      setCreating(false);
    }
  }

  function parseCsv(text: string): NewStudent[] {
    const lines = text.trim().split(/\\r?\\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const hasHeader = header.includes("register_number") || header.includes("full_name");
    const rows = hasHeader ? lines.slice(1) : lines;
    const idx = (name: string) => (hasHeader ? header.indexOf(name) : -1);
    const result: NewStudent[] = [];
    for (const line of rows) {
      const cols = line.split(",").map((c) => c.trim());
      const get = (name: string, fallbackIndex: number) => {
        const i = idx(name);
        return i >= 0 ? cols[i] ?? "" : cols[fallbackIndex] ?? "";
      };
      const register_number = get("register_number", 0);
      const full_name = get("full_name", 1);
      const parent_phone = get("parent_phone", 6);
      if (!register_number || !full_name || !parent_phone) continue;
      const email = get("email", 2) || null;
      const semesterRaw = get("semester", 3);
      const section = get("section", 4) || null;
      const admissionRaw = get("admission_year", 5);
      const parent_name = get("parent_name", 7) || null;
      result.push({
        register_number,
        full_name,
        email,
        semester: semesterRaw ? Number(semesterRaw) : 1,
        section,
        admission_year: admissionRaw ? Number(admissionRaw) : null,
        parent_name: parent_name,
        parent_phone: parent_phone,
      });
    }
    return result;
  }

  async function handleImport() {
    const rows = importRows.length ? importRows : parseCsv(importText);
    if (rows.length === 0) {
      toast.error("No valid student rows found.");
      return;
    }
    setImporting(true);
    try {
      const res = await studentApi.import(rows, importDryRun);
      setImportResult(res);
      toast.success(importDryRun ? "Dry run completed." : "Import completed.");
      if (!importDryRun) await load(page, q, status);
    } catch (e) {
      const message = friendlyMessage(e); toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  async function handleDeactivate() {
    if (!target) return;
    setActing(true);
    try {
      await studentApi.deactivate(target.id);
      setDeactivateOpen(false);
      setTarget(null);
      await load(page, q, status);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    } finally {
      setActing(false);
    }
  }

  async function handleRestore(s: StudentRecord) {
    try {
      await studentApi.restore(s.id);
      await load(page, q, status);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    }
  }

  async function handleResetPassword(s: StudentRecord) {
    try {
      const res = await studentApi.resetPassword(s.id);
      setCreated(res);
    } catch (e) {
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Students</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportResult(null); setImportRows([]); setImportText(""); setImportOpen(true); }}>
            Import CSV
          </Button>
          <Button
            onClick={() => {
              setForm({
                register_number: "",
                full_name: "",
                email: "",
                semester: "1",
                section: "",
                admission_year: "",
                parent_phone: "",
                parent_name: "",
              });
              setCreateOpen(true);
            }}
          >
            Add student
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search students…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1, q, status); } }} className="pl-9" />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "graduated", label: "Graduated" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            load(1, q, status);
          }}
        >
          Search
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <Loading />
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
                      <div className="flex gap-2">
                        {s.status !== "archived" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setTarget(s);
                              setDeactivateOpen(true);
                            }}
                          >
                            Deactivate
                          </Button>
                        )}
                        {s.status === "archived" && (
                          <Button size="sm" variant="outline" onClick={() => handleRestore(s)}>
                            Restore
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleResetPassword(s)}>
                          Reset password
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add student">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input
            label="Register number"
            type="text"
            value={form.register_number}
            onChange={(e) => setForm((prev) => ({ ...prev, register_number: e.target.value }))}
            required
          />
          <Input
            label="Full name"
            type="text"
            value={form.full_name}
            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="Semester"
            type="number"
            min={1}
            max={12}
            value={form.semester}
            onChange={(e) => setForm((prev) => ({ ...prev, semester: e.target.value }))}
            required
          />
          <Input
            label="Section"
            type="text"
            value={form.section}
            onChange={(e) => setForm((prev) => ({ ...prev, section: e.target.value }))}
          />
          <Input
            label="Admission year"
            type="number"
            min={2000}
            max={2100}
            value={form.admission_year}
            onChange={(e) => setForm((prev) => ({ ...prev, admission_year: e.target.value }))}
          />
          <Input
            label="Parent name"
            type="text"
            value={form.parent_name}
            onChange={(e) => setForm((prev) => ({ ...prev, parent_name: e.target.value }))}
          />
          <Input
            label="Parent phone"
            type="tel"
            value={form.parent_phone}
            onChange={(e) => setForm((prev) => ({ ...prev, parent_phone: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        title="Temporary credentials"
      >
        {created && (
          <div className="space-y-2 text-sm">
            <p>
              Student: <strong>{created.student.full_name}</strong> ({created.student.register_number})
            </p>
            <p>
              Temporary password: <code className="break-all">{created.temporary_password}</code>
            </p>
            <p className="text-muted-foreground">
              Share this password securely; the student must change it on first login.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setCreated(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deactivateOpen}
        title="Deactivate student?"
        description="This archives the student account."
        confirmLabel="Deactivate"
        destructive
        loading={acting}
        onConfirm={handleDeactivate}
        onCancel={() => {
          setDeactivateOpen(false);
          setTarget(null);
        }}
      />

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import students (CSV)">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste CSV with columns: register_number, full_name, email, semester, section, admission_year, parent_phone, parent_name.
          </p>
          <Textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportRows(parseCsv(e.target.value));
            }}
            rows={8}
            placeholder="register_number,full_name,email,semester,section,admission_year,parent_phone,parent_name"
          />
          <p className="text-sm text-muted-foreground">
            Parsed rows: {importRows.length}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={importDryRun} onChange={(e) => setImportDryRun(e.target.checked)} />
            Dry run (validate only)
          </label>
          {importResult && (
            <div className="app-card space-y-1 text-sm">
              <p>Total: {importResult.total} · Succeeded: {importResult.succeeded} · Failed: {importResult.failed}</p>
              {importResult.rows.filter((r) => r.status === "failed").slice(0, 5).map((r) => (
                <p key={r.row} className="text-destructive">
                  Row {r.row}: {r.error}
                </p>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Close
            </Button>
            <Button loading={importing} onClick={handleImport}>
              {importDryRun ? "Run dry run" : "Import"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}