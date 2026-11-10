import { request } from "./client";
import type {
  AuditLogEntry,
  Dashboard,
  LeaveReport,
  Paged,
} from "@/src/types";

export const adminApi = {
  dashboard: () => request<Dashboard>("/api/v1/admin/dashboard"),

  auditLogs: (params?: {
    entity_type?: string;
    page?: number;
    per_page?: number;
  }) => request<Paged<AuditLogEntry>>("/api/v1/admin/audit-logs", { query: params }),

  leaveReport: (params?: {
    from?: string;
    to?: string;
    status?: string;
    request_type?: string;
    student_id?: string;
    sort?: string;
    page?: number;
    per_page?: number;
  }) => request<LeaveReport>("/api/v1/admin/reports/leaves", { query: params }),

  documentsReview: (params?: {
    verification_status?: string;
    page?: number;
    per_page?: number;
  }) => request<Paged<import("@/src/types").DocumentRecord>>("/api/v1/admin/documents", {
    query: params,
  }),

  healthLive: () => request<{ status: string }>("/api/v1/health/live"),

  healthReady: () =>
    request<{ status: string; database: string }>("/api/v1/health/ready"),

  createStaff: (body: {
    email: string;
    full_name: string;
    roles: string[];
  }) =>
    request<import("@/src/types").CreatedStaff>("/api/v1/users", {
      method: "POST",
      body,
    }),
};
