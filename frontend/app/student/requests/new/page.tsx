"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveApi } from "@/src/lib/api/leaveApi";
import { Input } from "@/src/components/ui/Input";
import { Textarea } from "@/src/components/ui/Textarea";
import { Select } from "@/src/components/ui/Select";
import { Button } from "@/src/components/ui/Button";

export default function NewRequestPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState("personal_leave");
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent, submitNow: boolean) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await leaveApi.create({
        request_type: requestType,
        reason,
        destination: destination || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      });
      if (submitNow) {
        await leaveApi.submit(created.id);
      }
      router.replace(`/student/requests/${created.id}`);
    } catch (err) {
      const e = err as { message?: string; fieldErrors?: Record<string, string[]> };
      const fe = e.fieldErrors ? Object.values(e.fieldErrors).flat().join(", ") : "";
      setError(fe || e?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground mb-6">New leave / permission request</h1>
      <form className="app-card flex flex-col gap-4">
        <Select
          label="Request type"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          options={[
            { value: "personal_leave", label: "Personal leave" },
            { value: "medical_leave", label: "Medical leave" },
            { value: "event_permission", label: "Event permission" },
            { value: "other", label: "Other" },
          ]}
        />
        <Textarea
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <Input
          label="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
          <Input
            label="End"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            loading={submitting}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
          >
            Save draft
          </Button>
          <Button
            type="button"
            loading={submitting}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
          >
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}