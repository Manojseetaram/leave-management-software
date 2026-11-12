"use client";

import React, { Suspense, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Loading } from "@/src/components/ui/Loading";
import Link from "next/link";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

function LoginForm() {
  const { login, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loading />;

  const expired = params.get("expired") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(loginValue, password);
      if (me.user.must_change_password) {
        router.replace("/change-password");
        return;
      }
      const primary = me.roles[0];
      if (primary === "student") router.replace("/student");
      else if (primary === "faculty") router.replace("/faculty");
      else if (primary === "hod") router.replace("/hod");
      else if (primary === "admin") router.replace("/admin");
      else router.replace("/");
    } catch (err) {
      const e = err as { message?: string };
      const message = friendlyMessage(e); setError(message); toast.error(message);;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md app-card">
      <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ISE Department Leave &amp; Permission Management
      </p>
      {expired && (
        <p className="mt-3 text-sm text-destructive">Your session expired. Please sign in again.</p>
      )}
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Email or username"
          value={loginValue}
          onChange={(e) => setLoginValue(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>
      <div className="mt-4 text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={<Loading />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}