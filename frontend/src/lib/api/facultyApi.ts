import { request } from "./client";
import type { FacultyLeaveRequest, FacultyStudent, Paged } from "@/src/types";

export const facultyApi = {
  students: (params?: {
    q?: string;
    semester?: number;
    section?: string;
    page?: number;
    per_page?: number;
  }) => request<Paged<FacultyStudent>>("/api/v1/faculty/students", { query: params }),

  leaveRequests: (params?: {
    status?: string;
    request_type?: string;
    student_id?: string;
    page?: number;
    per_page?: number;
  }) =>
    request<Paged<FacultyLeaveRequest>>("/api/v1/faculty/leave-requests", {
      query: params,
    }),
};
