/**
 * Base URL of the backend API.
 *
 * In development VITE_API_BASE_URL is normally left unset, so the client uses
 * the relative path "/api/v1". Vite proxies /api to the Rust/Axum backend
 * (see vite.config.ts), which keeps the browser same-origin.
 *
 * In a production build set VITE_API_BASE_URL to the absolute API root, for
 * example "https://leave-api.example.com/api/v1".
 */
const DEFAULT_BASE_URL = '/api/v1'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL
).replace(/\/+$/, '')
