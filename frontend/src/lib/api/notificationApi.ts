import { request } from "./client";
import type { NotificationDetail, NotificationRecord, Paged } from "@/src/types";

export const notificationApi = {
  list: (params?: {
    status?: string;
    event_type?: string;
    page?: number;
    per_page?: number;
  }) => request<Paged<NotificationRecord>>("/api/v1/notifications", { query: params }),

  get: (id: string) => request<NotificationDetail>(`/api/v1/notifications/${id}`),
};
