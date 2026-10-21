import { API_BASE_URL } from './apiConfig'
import { tokenStore } from './tokenStore'

import type { ApiErrorBody, ApiErrorCode } from '../types/api'

/**
 * The single typed entry point to the backend. Every API module goes through
 * `request`, so the bearer token, the error shape and the 401 handling are
 * defined in exactly one place.
 */

/** Fired when the backend rejects the session, so the app can sign out. */
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

/** Fired when the caller still has to replace their temporary password. */
export const PASSWORD_CHANGE_REQUIRED_EVENT = 'auth:password-change-required'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | string

  constructor(status: number, code: ApiErrorCode | string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  const base = `${API_BASE_URL}${suffix}`

  if (!query) return base

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }

  const search = params.toString()
  return search ? `${base}?${search}` : base
}

function fallbackCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return 'unauthenticated'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 422:
      return 'validation_error'
    default:
      return 'internal_error'
  }
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'The requested record was not found.'
    case 409:
      return 'That action conflicts with the current state of the record.'
    case 422:
      return 'Please correct the highlighted fields.'
    default:
      return `Request failed with status ${status}.`
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const body = payload as Partial<ApiErrorBody> | null
  const code = body?.error?.code ?? fallbackCode(status)
  const message = body?.error?.message ?? fallbackMessage(status)
  return new ApiError(status, code, message)
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function emit(name: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(name))
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  const token = tokenStore.getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      0,
      'network_error',
      'Could not reach the server. Check your connection and try again.',
    )
  }

  // 204 No Content is the backend's answer for every mutating action.
  if (response.status === 204) return undefined as T

  const payload = await readBody(response)

  if (!response.ok) {
    if (response.status === 401) emit(UNAUTHORIZED_EVENT)
    if (
      response.status === 403 &&
      (payload as Partial<ApiErrorBody> | null)?.error?.code ===
        'password_change_required'
    ) {
      emit(PASSWORD_CHANGE_REQUIRED_EVENT)
    }
    throw toApiError(response.status, payload)
  }

  return payload as T
}
