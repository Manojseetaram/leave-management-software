"use client";

import React, { useState } from "react";
import { authApi } from "@/src/lib/api/authApi";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email);
      setMessage(res.message ?? "If the email exists, a reset link has been sent.");
      if (res.reset_token) setToken(res.reset_token);
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message ?? "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md app-card">
        <h1 className="text-2xl font-semibold text-foreground">Forgot password</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {token && (
            <p className="text-sm text-muted-foreground">
              Dev reset token: <code className="break-all">{token}</code>
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" loading={submitting} className="w-full">
            Send reset link
          </Button>
        </form>
      </div>
    </div>
  );
}