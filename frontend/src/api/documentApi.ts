import { download, request, upload } from './client'

import type { DocumentRecord } from '../types/document'

/** GET /leave-requests/:id/documents — the student's own authorized evidence. */
export const listForRequest = (leaveRequestId: string) =>
  request<{ items: DocumentRecord[] }>(`/leave-requests/${leaveRequestId}/documents`)

/** POST /leave-requests/:id/documents — the student uploads one document. */
export const uploadForLeave = async (
  leaveRequestId: string,
  file: File,
  documentType: string,
): Promise<DocumentRecord> => {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('file', file, file.name)

  return upload<DocumentRecord>(`/leave-requests/${leaveRequestId}/documents`, formData)
}

/** GET /events/:id/evidence — the student's own event evidence. */
export const listEvidence = (eventId: string) =>
  request<{ items: DocumentRecord[] }>(`/events/${eventId}/evidence`)

/** POST /events/:id/evidence — upload participation evidence. */
export const uploadEvidence = async (
  eventId: string,
  file: File,
  documentType: string,
): Promise<DocumentRecord> => {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('file', file, file.name)

  return upload<DocumentRecord>(`/events/${eventId}/evidence`, formData)
}

/** GET /documents/:id/download — authorized, private download. */
export const downloadDocument = (id: string) => download(`/documents/${id}/download`)

/** PATCH /documents/:id/verification — reviewer workflow. */
export const verify = (
  id: string,
  body: { status: 'verified' | 'rejected'; review_notes?: string },
) =>
  request<DocumentRecord>(`/documents/${id}/verification`, {
    method: 'PATCH',
    body,
  })
