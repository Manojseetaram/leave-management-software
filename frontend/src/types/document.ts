/** Leave documents and event evidence (crates/domain/src/models.rs). */

import type { ListParams } from './api'

export interface DocumentRecord {
  id: string
  leave_request_id: string | null
  event_id: string | null
  uploader_id: string
  document_type: string
  original_filename: string
  content_type: string
  size_bytes: number
  checksum_sha256: string
  malware_scan_status: string
  verification_status: 'unverified' | 'verified' | 'rejected'
  verified_by: string | null
  verified_at: string | null
  review_notes: string | null
  created_at: string
}

export interface DownloadedDocument {
  bytes: Blob
  contentType: string
  originalFilename: string
}

/** The body of the evidence verification endpoint. */
export interface DocumentVerificationBody {
  status: 'verified' | 'rejected'
  review_notes?: string
}

/** Query parameters accepted by reviewer document lists. */
export interface DocumentListParams extends ListParams {
  verification_status?: 'unverified' | 'verified' | 'rejected'
}
