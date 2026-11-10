import { getToken, setToken } from "@/src/lib/tokenStore";

export interface ApiErrorInit {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors: Record<string, string[]>;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? {};
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return raw.replace(/\/+$/, "");
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const qs = query ? buildQueryString(query) : "";
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return qs ? `${url}?${qs}` : url;
}

function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

async function parseError(response: Response): Promise<ApiError> {
  let code = "unknown_error";
  let message = response.statusText || "Request failed";
  let fieldErrors: Record<string, string[]> = {};
  try {
    const data = await response.json();
    const err = (data && (data.error ?? data)) as
      | { code?: string; message?: string; fields?: Record<string, string[]>; fieldErrors?: Record<string, string[]> }
      | undefined;
    if (err) {
      code = err.code ?? code;
      message = err.message ?? message;
      fieldErrors = err.fieldErrors ?? err.fields ?? fieldErrors;
    }
  } catch {
    // non-JSON body
  }
  return new ApiError({ status: response.status, code, message, fieldErrors });
}

function clearCaches() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("leave.")) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, headers = {}, signal } = options;
  const token = getToken();
  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    signal,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const error = await parseError(response);
    if (response.status === 401 && token) {
      setToken(null);
      clearCaches();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave:signout", { detail: { reason: "expired" } }));
        window.location.href = "/login?expired=1";
      }
    } else if (response.status === 403 && error.code === "password_change_required") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave:password-change-required"));
        window.location.href = "/change-password";
      }
    }
    throw error;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export async function upload<T = unknown>(
  path: string,
  formData: FormData,
  query?: Record<string, unknown>,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(buildUrl(path, query), {
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 204) {
    return undefined as T;
  }
  if (!response.ok) {
    const error = await parseError(response);
    if (response.status === 401 && token) {
      setToken(null);
      clearCaches();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave:signout", { detail: { reason: "expired" } }));
        window.location.href = "/login?expired=1";
      }
    } else if (response.status === 403 && error.code === "password_change_required") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave:password-change-required"));
        window.location.href = "/change-password";
      }
    }
    throw error;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export async function download(
  path: string,
  query?: Record<string, unknown>,
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(buildUrl(path, query), { headers });
  if (!response.ok) {
    const error = await parseError(response);
    if (response.status === 401 && token) {
      setToken(null);
      clearCaches();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave:signout", { detail: { reason: "expired" } }));
        window.location.href = "/login?expired=1";
      }
    }
    throw error;
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? "download";
  return { blob, filename };
}