"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveApi } from "@/src/lib/api/leaveApi";
import { Input } from "@/src/components/ui/Input";
import { Textarea } from "@/src/components/ui/Textarea";
import { Select } from "@/src/components/ui/Select";
import { Button } from "@/src/components/ui/Button";
import { toast } from "sonner";
import { friendlyMessage } from "@/src/lib/errors";

export default function NewRequestPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState("personal_leave");
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(submitNow: boolean) {
    setError(null);

    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError("Start and end dates are required");
      return;
    }
    if (endDate <= startDate) {
      setError("End date must be after start date");
      return;
    }

    setSubmitting(true);
    try {
      const created = await leaveApi.create({
        request_type: requestType,
        reason: reason.trim(),
        destination: destination.trim() || null,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
      });
      if (submitNow) {
        await leaveApi.submit(created.id);
      }
      router.replace(`/student/requests/${created.id}`);
    } catch (err) {
      const apiErr = err as { message?: string; fieldErrors?: Record<string, string[]> };
      const fe = apiErr.fieldErrors ? Object.values(apiErr.fieldErrors).flat().join(", ") : "";
      const message = fe || friendlyMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-center text-2xl font-semibold text-foreground sm:text-left">
        New leave / permission request
      </h1>

      <form
        className="app-card flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(true);
        }}
      >
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            min={startAt || undefined}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
          >
            Save draft
          </Button>
          <Button type="submit" className="w-full sm:w-auto" loading={submitting} disabled={submitting}>
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}