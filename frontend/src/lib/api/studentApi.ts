import { request } from "./client";
import type {
  BulkImportResult,
  CreatedStudent,
  NewStudent,
  Paged,
  StudentRecord,
  UpdateStudent,
} from "@/src/types";

export const studentApi = {
  create: (body: NewStudent) =>
    request<CreatedStudent>("/api/v1/students", { method: "POST", body }),

  list: (params?: {
    q?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }) => request<Paged<StudentRecord>>("/api/v1/students", { query: params }),

  get: (id: string) => request<StudentRecord>(`/api/v1/students/${id}`),

  update: (id: string, body: UpdateStudent) =>
    request<StudentRecord>(`/api/v1/students/${id}`, { method: "PATCH", body }),

  deactivate: (id: string) =>
    request<StudentRecord>(`/api/v1/students/${id}`, { method: "DELETE" }),

  restore: (id: string) =>
    request<StudentRecord>(`/api/v1/students/${id}/restore`, { method: "POST" }),

  resetPassword: (id: string) =>
    request<CreatedStudent>(`/api/v1/students/${id}/reset-password`, {
      method: "POST",
    }),

  history: (id: string, params?: { page?: number; per_page?: number }) =>
    request<Paged<import("@/src/types").LeaveRequest>>(
      `/api/v1/students/${id}/history`,
      { query: params },
    ),

  parents: (id: string) =>
    request<{ items: import("@/src/types").ParentContact[] }>(
      `/api/v1/students/${id}/parents`,
    ),

  import: (students: NewStudent[], dry_run = false) =>
    request<BulkImportResult>("/api/v1/students/import", {
      method: "POST",
      body: { students, dry_run },
    }),
};
