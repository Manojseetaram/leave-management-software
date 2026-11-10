import { request } from "./client";
import type { EventRecord, NewEvent, Paged, UpdateEvent } from "@/src/types";

export const eventApi = {
  create: (body: NewEvent) =>
    request<EventRecord>("/api/v1/events", { method: "POST", body }),

  list: (params?: { page?: number; per_page?: number }) =>
    request<Paged<EventRecord>>("/api/v1/events", { query: params }),

  get: (id: string) => request<EventRecord>(`/api/v1/events/${id}`),

  update: (id: string, body: UpdateEvent) =>
    request<EventRecord>(`/api/v1/events/${id}`, { method: "PATCH", body }),
};
