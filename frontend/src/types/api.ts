/**
 * Transport-level types shared by every API module.
 * These mirror the shapes produced by the Rust backend
 * (crates/domain/src/models.rs and crates/api/src/error.rs).
 */

/** Every paginated endpoint answers with this envelope. */
export interface Paged<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

/** Query parameters accepted by the paginated endpoints. */
export interface ListParams {
  page?: number
  per_page?: number
}

/** The body the backend sends with every non-2xx response. */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

/** The error codes the backend can return (crates/api/src/error.rs). */
export type ApiErrorCode =
  | 'validation_error'
  | 'unauthenticated'
  | 'forbidden'
  | 'password_change_required'
  | 'not_found'
  | 'conflict'
  | 'internal_error'
