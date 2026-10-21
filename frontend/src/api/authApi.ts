import { request } from './client'

import type {
  ChangePasswordPayload,
  LoginPayload,
  LoginResponse,
  MeResponse,
  SessionInfo,
} from '../types/auth'

/** POST /auth/login — staff use their email, students their register number. */
export const login = (payload: LoginPayload) =>
  request<LoginResponse>('/auth/login', { method: 'POST', body: payload })

/** POST /auth/logout — revokes the current session. */
export const logout = () => request<void>('/auth/logout', { method: 'POST' })

/** GET /auth/me — the current user, their roles and their student id. */
export const me = () => request<MeResponse>('/auth/me')

/** POST /auth/change-password — every other session of the user is revoked. */
export const changePassword = (payload: ChangePasswordPayload) =>
  request<void>('/auth/change-password', { method: 'POST', body: payload })

/** GET /auth/sessions */
export const listSessions = () => request<{ items: SessionInfo[] }>('/auth/sessions')

/** DELETE /auth/sessions/:id */
export const revokeSession = (sessionId: string) =>
  request<void>(`/auth/sessions/${sessionId}`, { method: 'DELETE' })

/** POST /auth/forgot-password — always answers 200, never leaks account existence. */
export const forgotPassword = (email: string) =>
  request<void>('/auth/forgot-password', { method: 'POST', body: { email } })

/** POST /auth/reset-password */
export const resetPassword = (token: string, newPassword: string) =>
  request<void>('/auth/reset-password', {
    method: 'POST',
    body: { token, new_password: newPassword },
  })
