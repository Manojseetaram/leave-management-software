import { useState } from 'react'
import { toast } from 'sonner'

import * as documentApi from '../../api/documentApi'
import * as eventApi from '../../api/eventApi'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { ErrorState, LoadingState } from '../../components/common/States'
import { useRequest } from '../../hooks/useRequest'

import type { DocumentRecord } from '../../types/document'
import type { LeaveRequest } from '../../types/leave'

const DEFAULT_DOCUMENT_TYPE = 'medical_certificate'

/**
 * Student-only document and evidence upload/download surface. The backend
 * authorizes the caller, validates the content and stores the object privately.
 */
export default function DocumentUploadPanel({ request }: { request: LeaveRequest }) {
  const eventsRequest = useRequest(
    `events:${request.id}`,
    () => eventApi.list(),
  )
  const event = eventsRequest.data?.items.find(
    (item) => item.leave_request_id === request.id,
  ) ?? null
  const eventId = event?.id ?? null

  const documentsKey = `student-documents:${request.id}`
  const documentsRequest = useRequest<DocumentRecord[]>(
    documentsKey,
    async () => {
      const source = eventId
        ? await documentApi.listEvidence(eventId)
        : await documentApi.listForRequest(request.id)
      return source.items
    },
  )

  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState(DEFAULT_DOCUMENT_TYPE)
  const [isUploading, setIsUploading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const documents = documentsRequest.data

  const upload = async () => {
    if (!file) {
      setActionError('Choose a file before uploading.')
      return
    }

    setIsUploading(true)
    setActionError(null)
    try {
      const created = eventId
        ? await documentApi.uploadEvidence(eventId, file, documentType)
        : await documentApi.uploadForLeave(request.id, file, documentType)

      setFile(null)
      await documentsRequest.reload()
      toast.success('The document was uploaded for review.')
      void created
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : 'The document could not be uploaded.',
      )
      toast.error('The document could not be uploaded.')
    } finally {
      setIsUploading(false)
    }
  }

  const download = async (id: string) => {
    try {
      const downloaded = await documentApi.downloadDocument(id)
      const url = URL.createObjectURL(downloaded.bytes)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = downloaded.originalFilename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : 'The document could not be downloaded.',
      )
    }
  }

  return (
    <section className="app-card p-5 md:p-6">
      <h2 className="text-section-title">Documents and evidence</h2>

      {documentsRequest.isLoading ? (
        <LoadingState label="Loading documents..." />
      ) : documentsRequest.error ? (
        <ErrorState message={documentsRequest.error} onRetry={documentsRequest.reload} />
      ) : documents === null ? (
        <p className="mt-2 text-sm text-muted-foreground">No documents found.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {documents.length === 0 && (
            <li className="text-sm text-muted-foreground">No documents or evidence yet.</li>
          )}
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {document.original_filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {document.document_type} · {document.verification_status.replaceAll('_', ' ')}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void download(document.id)}
              >
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-foreground">Upload supporting evidence</h3>

        {actionError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {actionError}
          </p>
        )}

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Input
            label="Document type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            placeholder="medical_certificate"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="document-upload">
              File
            </label>
            <input
              id="document-upload"
              type="file"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-medium hover:file:bg-accent"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => void upload()}
            disabled={isUploading || !file}
          >
            {isUploading ? 'Uploading...' : 'Upload document'}
          </Button>
        </div>
      </div>
    </section>
  )
}
