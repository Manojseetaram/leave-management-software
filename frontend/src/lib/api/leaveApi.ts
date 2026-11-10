import { request } from "./client";
import type { LeaveRequest, NewLeave, Paged, UpdateLeave } from "@/src/types";

export const leaveApi = {
  create: (body: NewLeave) =>
    request<LeaveRequest>("/api/v1/leave-requests", { method: "POST", body }),

  list: (params?: { status?: string; page?: number; per_page?: number }) =>
    request<Paged<LeaveRequest>>("/api/v1/leave-requests", { query: params }),

  get: (id: string) => request<LeaveRequest>(`/api/v1/leave-requests/${id}`),

  update: (id: string, body: UpdateLeave) =>
    request<LeaveRequest>(`/api/v1/leave-requests/${id}`, {
      method: "PATCH",
      body,
    }),

  submit: (id: string, comment?: string) =>
    request<LeaveRequest>(`/api/v1/leave-requests/${id}/submit`, {
      method: "POST",
      body: comment ? { comment } : {},
    }),

  withdraw: (id: string, comment?: string) =>
    request<LeaveRequest>(`/api/v1/leave-requests/${id}/withdraw`, {
      method: "POST",
      body: comment ? { comment } : {},
    }),

  approve: (id: string, comment?: string) =>
    request<LeaveRequest>(`/api/v1/leave-requests/${id}/approve`, {
      method: "POST",
      body: comment ? { comment } : {},
    }),

  reject: (id: string, comment: string) =>
    request<LeaveRequest>(`/api/v1/leave-requests/${id}/reject`, {
      method: "POST",
      body: { comment },
    }),

  requestChanges: (id: string, comment: string) =>
    request<LeaveRequest>(`/api/v1/leave-requests/${id}/request-changes`, {
      method: "POST",
      body: { comment },
    }),

  recordReturn: (id: string, comment?: string) =>
    request<LeaveRequest>(`/api/v1/leave-requests/${id}/return`, {
      method: "POST",
      body: comment ? { comment } : {},
    }),

  complete: (id: string, comment?: string) =>
    request<LeaveRequest>(`/api/v1/leave-requests/${id}/completion`, {
      method: "POST",
      body: comment ? { comment } : {},
    }),

  history: (id: string) =>
    request<{ items: import("@/src/types").RequestHistoryEntry[] }>(
      `/api/v1/leave-requests/${id}/history`,
    ),
};
