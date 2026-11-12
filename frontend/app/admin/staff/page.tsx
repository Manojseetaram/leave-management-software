"use client";

import React, { useState } from "react";
import { adminApi } from "@/src/lib/api/adminApi";
import type { CreatedStaff } from "@/src/types";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Modal } from "@/src/components/ui/Modal";
import { EmptyState } from "@/src/components/ui/EmptyState";

export default function AdminStaffPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roles, setRoles] = useState<string[]>(["faculty"]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedStaff | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await adminApi.createStaff({ email, full_name: fullName, roles });
      setCreated(res);
      setEmail("");
      setFullName("");
      setRoles(["faculty"]);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Create failed");
    } finally {
      setCreating(false);
    }
  }

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Staff accounts</h1>
      <form onSubmit={handleSubmit} className="app-card flex flex-col gap-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Full name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Roles</p>
          <div className="flex gap-3">
            {["faculty", "hod", "admin"].map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={() => toggleRole(r)}
                />
                {r}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" loading={creating}>
          Create staff account
        </Button>
      </form>

      <Modal open={!!created} onClose={() => setCreated(null)} title="Temporary credentials">
        {created && (
          <div className="space-y-2 text-sm">
            <p>
              User: <strong>{created.user.full_name}</strong> ({created.user.email})
            </p>
            <p>
              Roles: {created.roles.join(", ")}
            </p>
            <p>
              Temporary password: <code className="break-all">{created.temporary_password}</code>
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setCreated(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      <EmptyState
        title="No staff list endpoint"
        description="Staff accounts are created here; management of existing accounts is not exposed by the API."
      />
    </div>
  );
}