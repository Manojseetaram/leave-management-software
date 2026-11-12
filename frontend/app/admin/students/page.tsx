"use client";

import React, { useEffect, useState } from "react";
import { studentApi } from "@/src/lib/api/studentApi";
import type { CreatedStudent, Paged, StudentRecord } from "@/src/types";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Pagination } from "@/src/components/ui/Pagination";
import { Input } from "@/src/components/ui/Input";
import { Select } from "@/src/components/ui/Select";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";

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
  });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedStudent | null>(null);

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
      setError((e as { message?: string })?.message ?? "Failed to load");
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
      });
      setCreated(res);
      setCreateOpen(false);
      setForm({
        register_number: "",
        full_name: "",
        email: "",
        semester: "1",
        section: "",
        admission_year: "",
      });
      await load(page, q, status);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Create failed");
    } finally {
      setCreating(false);
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
      setError((e as { message?: string })?.message ?? "Deactivate failed");
    } finally {
      setActing(false);
    }
  }

  async function handleRestore(s: StudentRecord) {
    try {
      await studentApi.restore(s.id);
      await load(page, q, status);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Restore failed");
    }
  }

  async function handleResetPassword(s: StudentRecord) {
    try {
      const res = await studentApi.resetPassword(s.id);
      setCreated(res);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Reset failed");
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Students</h1>
        <Button onClick={() => setCreateOpen(true)}>Add student</Button>
      </div>
      <div className="flex flex-wrap gap-3 max-w-2xl">
        <Input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
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
            onChange={(e) => setForm({ ...form, register_number: e.target.value })}
            required
          />
          <Input
            label="Full name"
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Semester"
            type="number"
            min={1}
            max={12}
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
            required
          />
          <Input
            label="Section"
            type="text"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
          />
          <Input
            label="Admission year"
            type="number"
            min={2000}
            max={2100}
            value={form.admission_year}
            onChange={(e) => setForm({ ...form, admission_year: e.target.value })}
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
    </div>
  );
}