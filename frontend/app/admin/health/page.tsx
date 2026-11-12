"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/src/lib/api/adminApi";
import { Loading } from "@/src/components/ui/Loading";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Button } from "@/src/components/ui/Button";

export default function AdminHealthPage() {
  const [live, setLive] = useState<{ status: string } | null>(null);
  const [ready, setReady] = useState<{ status: string; database: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [l, r] = await Promise.all([adminApi.healthLive(), adminApi.healthReady()]);
      setLive(l);
      setReady(r);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loading />;
  if (error) return <EmptyState title="Error" description={error} action={<Button onClick={load}>Retry</Button>} />;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">System health</h1>
      <div className="app-card space-y-2">
        <p><span className="font-medium">Liveness:</span> {live?.status ?? "—"}</p>
        <p><span className="font-medium">Readiness:</span> {ready?.status ?? "—"}</p>
        <p><span className="font-medium">Database:</span> {ready?.database ?? "—"}</p>
      </div>
      <Button onClick={load}>Refresh</Button>
    </div>
  );
}