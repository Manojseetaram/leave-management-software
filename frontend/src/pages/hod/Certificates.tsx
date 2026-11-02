import { useState } from 'react'
import { useRequest } from '../../hooks/useRequest'
import * as adminApi from '../../api/adminApi'
import * as documentApi from '../../api/documentApi'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { ErrorState, LoadingState } from '../../components/common/States'

import { formatDateTime } from '../../utils/format'

import type { DocumentRecord } from '../../types/document'

export default function Certificates() {
  const { data, error, isLoading, reload } = useRequest(
    'hod:certificates:unverified',
    () => adminApi.documents({ verification_status: 'unverified' }),
  )

  const [selected, setSelected] = useState<DocumentRecord | null>(null)
  const [notes, setNotes] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)

  const review = async () => {
    if (!selected) return
    setIsReviewing(true)
    try {
      await documentApi.verify(selected.id, {
        status: selected.verification_status === 'rejected' ? 'rejected' : 'verified',
        review_notes: notes.trim() || undefined,
      })
      setSelected(null)
      setNotes('')
      await reload()
    } finally {
      setIsReviewing(false)
    }
  }

  const documents = data?.items ?? []

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Certificates and evidence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verify uploaded medical or participation evidence.</p>
        </div>
      </header>

      {isLoading ? (
        <LoadingState label="Loading the verification queue..." />
      ) : error ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : documents.length === 0 ? (
        <div className="app-card">
          <p className="p-6 text-sm text-muted-foreground">The unverified evidence queue is empty.</p>
        </div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Related request</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{document.original_filename}</td>
                    <td className="px-4 py-3 text-muted-foreground">{document.document_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{document.leave_request_id ?? document.event_id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(document.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => { setSelected(document); setNotes(''); setIsReviewing(false) }}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={selected !== null}
        title={selected?.verification_status === 'rejected' ? 'Reject evidence?' : 'Verify evidence?'}
        description="Evidence starts unverified. A reviewer decision is stored with the record."
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={isReviewing}>Cancel</Button>
            <Button variant={selected?.verification_status === 'rejected' ? 'danger' : 'primary'} isLoading={isReviewing} onClick={() => void review()}>Confirm</Button>
          </>
        }
      >
        {selected?.verification_status === 'rejected' ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Review note</span>
            <textarea
              className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Why is this evidence rejected?"
            />
          </label>
        ) : null}
      </Modal>
    </div>
  )
}
