"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authApi } from "@/src/lib/api/authApi";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Loading } from "@/src/components/ui/Loading";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setMessage("Password reset. You can now sign in.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      const e = err as { message?: string };
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Reset code from email"
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        required
      />
      <Input
        label="New password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" loading={submitting} className="w-full">
        Reset password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md app-card">
        <h1 className="text-2xl font-semibold text-foreground">Reset password</h1>
        <div className="mt-6">
          <Suspense fallback={<Loading />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}