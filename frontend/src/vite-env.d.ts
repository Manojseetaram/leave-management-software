/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the Rust/Axum API, e.g. "http://localhost:8080/api/v1".
   * Leave it unset in development: the client then uses the relative "/api/v1"
   * path, which Vite proxies to the backend (see vite.config.ts).
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
