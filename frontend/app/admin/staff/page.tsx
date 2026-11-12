"use client";

import React, { useState } from "react";
import {
  UserPlus,
  Mail,
  User,
  ShieldCheck,
  GraduationCap,
  Crown,
  Copy,
  Check,
  Info,
  KeyRound,
} from "lucide-react";
import { adminApi } from "@/src/lib/api/adminApi";
import type { CreatedStaff } from "@/src/types";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Modal } from "@/src/components/ui/Modal";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";
import { cn } from "@/src/utils/format";

const ROLE_OPTIONS = [
  { value: "faculty", label: "Faculty", hint: "Reviews student requests", icon: GraduationCap },
  { value: "hod", label: "HOD", hint: "Approves or rejects leave", icon: Crown },
  { value: "admin", label: "Admin", hint: "Manages accounts", icon: ShieldCheck },
] as const;

function humanize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AdminStaffPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roles, setRoles] = useState<string[]>(["faculty"]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedStaff | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (roles.length === 0) {
      setError("Select at least one role");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await adminApi.createStaff({
        email: email.trim(),
        full_name: fullName.trim(),
        roles,
      });
      setCreated(res);
      toast.success("Staff account created.");
      setEmail("");
      setFullName("");
      setRoles(["faculty"]);
    } catch (err) {
      const message = friendlyMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  function toggleRole(role: string) {
    setError(null);
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function copyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporary_password);
      setCopied(true);
      toast.success("Password copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Please copy it manually.");
    }
  }

  function closeModal() {
    setCreated(null);
    setCopied(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 text-center sm:p-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-600 text-white shadow-md">
          <UserPlus size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Staff accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new faculty, HOD or admin account.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="app-card flex flex-col gap-5 text-left">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <Input
              label="Full name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Roles */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Roles</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ROLE_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
              const selected = roles.includes(value);
              return (
                <label
                  key={value}
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-center transition",
                    selected
                      ? "border-foreground bg-muted shadow-sm"
                      : "border-border bg-card hover:bg-muted/60",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected}
                    onChange={() => toggleRole(value)}
                  />
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                      <Check size={12} />
                    </span>
                  )}
                  <Icon size={22} className={selected ? "text-foreground" : "text-muted-foreground"} />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-center">
          <Button type="submit" className="w-full sm:w-auto sm:min-w-56" loading={creating} disabled={creating}>
            <span className="inline-flex items-center gap-2">
              <UserPlus size={16} />
              Create staff account
            </span>
          </Button>
        </div>
      </form>

      {/* Info note */}
      <div className="app-card flex flex-col items-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Info size={20} />
        </div>
        <p className="text-sm font-medium text-foreground">Existing accounts</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Staff accounts are created here. Managing existing accounts is not exposed by the API yet.
        </p>
      </div>

      {/* Credentials modal */}
      <Modal open={!!created} onClose={closeModal} title="Temporary credentials">
        {created && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                <KeyRound size={22} />
              </div>
              <p className="text-muted-foreground">
                Share these details with the staff member. The password is shown only once.
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-center gap-3">
                <User size={16} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate font-medium text-foreground">
                  {created.user.full_name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-all text-foreground">{created.user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} className="shrink-0 text-muted-foreground" />
                <span className="flex flex-wrap gap-1.5">
                  {created.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                    >
                      {humanize(r)}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                Temporary password
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
                <code className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
                  {created.temporary_password}
                </code>
                <button
                  type="button"
                  onClick={copyPassword}
                  aria-label="Copy password"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-background"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <Button className="w-full sm:w-auto sm:min-w-32" onClick={closeModal}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}