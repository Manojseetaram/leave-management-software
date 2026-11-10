import { request } from "./client";
import type { NewParent, ParentContact, UpdateParent } from "@/src/types";

export const parentApi = {
  create: (body: NewParent) =>
    request<ParentContact>("/api/v1/parents", { method: "POST", body }),

  update: (id: string, body: UpdateParent) =>
    request<ParentContact>(`/api/v1/parents/${id}`, { method: "PATCH", body }),

  verify: (id: string) =>
    request<ParentContact>(`/api/v1/parents/${id}/verify`, { method: "POST" }),

  listForStudent: (studentId: string) =>
    request<{ items: ParentContact[] }>(`/api/v1/students/${studentId}/parents`),
};
