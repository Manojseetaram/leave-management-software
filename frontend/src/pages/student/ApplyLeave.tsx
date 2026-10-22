import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Lock } from 'lucide-react'

import { ApiError } from '../../api/client'
import * as leaveApi from '../../api/leaveApi'

import Button from '../../components/common/Button'
import Callout from '../../components/common/Callout'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import DocumentsNotice from '../../components/student/DocumentsNotice'
import LeaveForm, { type LeaveFormIntent } from '../../components/student/LeaveForm'

import { useRequest } from '../../hooks/useRequest'

import { fromDateTimeLocal, toDateTimeLocal } from '../../utils/format'
import { isEditable } from '../../utils/leave'

import type { LeaveFormValues, LeaveRequest, NewLeave, UpdateLeave } from '../../types/leave'

const STEPS = [
  'A new request starts as a draft.',
  'Submitting sends it to the Head of Department.',
  'You can withdraw a request while it is still pending.',
  'If changes are requested, edit the request and submit it again.',
]

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
      <PageHeader
        title={isEditing ? 'Edit request' : 'Apply for leave'}
        description={
          isEditing
            ? 'Only drafts and returned requests can be changed.'
            : 'Fill in the details and send the request to your Head of Department.'
        }
        eyebrow={
          <Link
            to="/student/history"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            My requests
          </Link>
        }
        actions={
          <Button variant="secondary" to="/student/history">
            My requests
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading the request..." />
      ) : error && !request ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : notEditable ? (
        <div className="app-card">
          <EmptyState
            icon={<Lock className="h-5 w-5" aria-hidden="true" />}
            title="This request can no longer be edited"
            description="A request can only be changed while it is a draft or while the Head of Department has asked for changes."
            action={
              <Button to={`/student/requests/${editId}`}>View the request</Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            {actionError && (
              <Callout
                tone="danger"
                role="alert"
                title="The request was not saved"
                className="mb-4"
              >
                {actionError}
              </Callout>
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

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <DocumentsNotice />

            {request?.status === 'changes_requested' && (
              <Callout tone="violet" title="Changes were requested">
                The Head of Department asked for changes. Update the request and
                submit it again.
              </Callout>
            )}

            <section className="app-card p-5">
              <h2 className="text-section-title">How this works</h2>

              <ol className="mt-4 space-y-3">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
                    >
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-sm text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Need help? Read the{' '}
              <Link to="/student/history" className="app-link">
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
