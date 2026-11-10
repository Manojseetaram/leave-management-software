import { request } from "./client";
import type {
  AuthMeResponse,
  LoginResponse,
  SessionInfo,
} from "@/src/types";

export const authApi = {
  login: (login: string, password: string) =>
    request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { login, password },
    }),

  logout: () => request<void>("/api/v1/auth/logout", { method: "POST" }),

  me: () => request<AuthMeResponse>("/api/v1/auth/me"),

  changePassword: (current_password: string, new_password: string) =>
    request<void>("/api/v1/auth/change-password", {
      method: "POST",
      body: { current_password, new_password },
    }),

  forgotPassword: (email: string) =>
    request<{ message: string; reset_token?: string; expires_at?: string }>(
      "/api/v1/auth/forgot-password",
      { method: "POST", body: { email } },
    ),

  resetPassword: (token: string, new_password: string) =>
    request<void>("/api/v1/auth/reset-password", {
      method: "POST",
      body: { token, new_password },
    }),

  sessions: () =>
    request<{ items: SessionInfo[]; current_session_id: string }>(
      "/api/v1/auth/sessions",
    ),

  revokeSession: (id: string) =>
    request<void>(`/api/v1/auth/sessions/${id}`, { method: "DELETE" }),
};
