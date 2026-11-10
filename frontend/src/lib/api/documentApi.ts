import { download, request, upload } from "./client";
import type { DocumentRecord, Paged } from "@/src/types";

export const documentApi = {
  uploadForLeave: (leaveRequestId: string, formData: FormData) =>
    upload<DocumentRecord>(
      `/api/v1/leave-requests/${leaveRequestId}/documents`,
      formData,
    ),

  listForLeave: (leaveRequestId: string) =>
    request<{ items: DocumentRecord[] }>(
      `/api/v1/leave-requests/${leaveRequestId}/documents`,
    ),

  uploadForEvent: (eventId: string, formData: FormData) =>
    upload<DocumentRecord>(`/api/v1/events/${eventId}/evidence`, formData),

  listEvidence: (eventId: string) =>
    request<{ items: DocumentRecord[] }>(`/api/v1/events/${eventId}/evidence`),

  download: (documentId: string) =>
    download(`/api/v1/documents/${documentId}/download`),

  verify: (documentId: string, body: { status: string; review_notes?: string }) =>
    request<DocumentRecord>(`/api/v1/documents/${documentId}/verification`, {
      method: "PATCH",
      body: { status: body.status, review_notes: body.review_notes },
    }),

  listReview: (params?: {
    verification_status?: string;
    page?: number;
    per_page?: number;
  }) =>
    request<Paged<DocumentRecord>>("/api/v1/admin/documents", {
      query: params,
    }),
};
