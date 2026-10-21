import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ApiError } from '../../api/client'
import * as leaveApi from '../../api/leaveApi'

import Button from '../../components/common/Button'
import { ErrorState, LoadingState } from '../../components/common/States'
import DocumentsNotice from '../../components/student/DocumentsNotice'
import LeaveForm, { type LeaveFormIntent } from '../../components/student/LeaveForm'

import { useRequest } from '../../hooks/useRequest'

import { fromDateTimeLocal, toDateTimeLocal } from '../../utils/format'
import { isEditable } from '../../utils/leave'

import type { LeaveFormValues, LeaveRequest, NewLeave, UpdateLeave } from '../../types/leave'

export default function ApplyLeave() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // The same form creates a request and edits an existing one. The mode is
  // taken from the query string so the screen keeps a single URL.
  const editId = searchParams.get('edit')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: request, error, isLoading, reload } = useRequest<LeaveRequest | null>(
    editId ?? 'new',
    () => (editId ? leaveApi.show(editId) : Promise.resolve(null)),
  )

  const handleSubmit = async (values: LeaveFormValues, intent: LeaveFormIntent) => {
    setIsSubmitting(true)
    setActionError(null)

    const payload = {
      request_type: values.request_type,
      reason: values.reason.trim(),
      destination: values.destination.trim(),
      start_at: fromDateTimeLocal(values.start_at),
      end_at: fromDateTimeLocal(values.end_at),
    }

    try {
      let saved: LeaveRequest

      if (editId) {
        saved = await leaveApi.update(editId, payload satisfies UpdateLeave)
      } else {
        saved = await leaveApi.create(payload satisfies NewLeave)
      }

      if (intent === 'submit') {
        saved = await leaveApi.submit(saved.id)
        toast.success('Request submitted for approval')
      } else {
        toast.success(editId ? 'Changes saved' : 'Saved as a draft')
      }

      navigate(`/student/requests/${saved.id}`, { replace: true })
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : 'The request could not be saved. Please try again.'
      setActionError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEditing = Boolean(editId)
  const notEditable = request !== null && !isEditable(request.status)

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">
            {isEditing ? 'Edit request' : 'Apply for leave'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEditing
              ? 'Only drafts and returned requests can be changed.'
              : 'Fill in the details and send the request to your Head of Department.'}
          </p>
        </div>

        <Button variant="secondary" to="/student/history">
          My requests
        </Button>
      </header>

      {isLoading ? (
        <LoadingState label="Loading the request..." />
      ) : error && !request ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : notEditable ? (
        <div className="app-card">
          <div className="empty-state px-6 py-12">
            <p className="text-base font-medium text-foreground">
              This request can no longer be edited
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              A request can only be changed while it is a draft or while the Head of
              Department has asked for changes.
            </p>
            <div className="mt-4">
              <Button to={`/student/requests/${editId}`}>View the request</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {actionError && (
              <p
                role="alert"
                className="app-card mb-4 border-destructive/40 p-3 text-sm text-destructive"
              >
                {actionError}
              </p>
            )}

            <LeaveForm
              key={request?.id ?? 'new'}
              initialValues={
                request
                  ? {
                      request_type: request.request_type,
                      reason: request.reason,
                      destination: request.destination ?? '',
                      start_at: toDateTimeLocal(request.start_at),
                      end_at: toDateTimeLocal(request.end_at),
                    }
                  : undefined
              }
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/student/history')}
              secondaryLabel={isEditing ? 'Save changes' : 'Save as draft'}
            />
          </div>

          <aside className="space-y-4">
            <DocumentsNotice />

            <div className="app-card p-4">
              <h2 className="text-sm font-semibold text-foreground">How this works</h2>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>1. A new request starts as a draft.</li>
                <li>2. Submitting sends it to the Head of Department.</li>
                <li>3. You can withdraw a request while it is still pending.</li>
                <li>
                  4. If changes are requested, edit the request and submit it again.
                </li>
              </ol>

              {request?.status === 'changes_requested' && (
                <p className="mt-3 border-t border-border pt-3 text-sm text-status-changes">
                  The Head of Department asked for changes. Update the request and
                  submit it again.
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Need help? Read the{' '}
              <Link
                to="/student/history"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                request history
              </Link>{' '}
              to see the state of your earlier requests.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
