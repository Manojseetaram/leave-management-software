import { useState, type FormEvent } from 'react'

import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import Textarea from '../common/Textarea'

import {
  MAX_DESTINATION_LENGTH,
  MAX_LEAVE_SPAN_DAYS,
  MAX_REASON_LENGTH,
  REQUEST_TYPE_LABELS,
} from '../../utils/leave'

import type { LeaveFormValues, RequestType } from '../../types/leave'

/** What the user wants to happen with the request. */
export type LeaveFormIntent = 'submit' | 'draft'

type FormErrors = Partial<Record<keyof LeaveFormValues, string>>

const EMPTY_VALUES: LeaveFormValues = {
  request_type: 'personal_leave',
  reason: '',
  destination: '',
  start_at: '',
  end_at: '',
}

const TYPE_OPTIONS = (Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((value) => ({
  value,
  label: REQUEST_TYPE_LABELS[value],
}))

/**
 * Mirrors the validation of `validate_leave` in the backend, so the user is
 * told what is wrong before a request is sent. The backend remains the
 * authority and its error is shown if it disagrees.
 */
function validate(values: LeaveFormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.reason.trim()) {
    errors.reason = 'A reason is required.'
  } else if (values.reason.trim().length > MAX_REASON_LENGTH) {
    errors.reason = `The reason must be at most ${MAX_REASON_LENGTH} characters.`
  }

  if (values.destination.trim().length > MAX_DESTINATION_LENGTH) {
    errors.destination = `The destination must be at most ${MAX_DESTINATION_LENGTH} characters.`
  }

  if (!values.start_at) {
    errors.start_at = 'Choose when the leave starts.'
  }

  if (!values.end_at) {
    errors.end_at = 'Choose when the leave ends.'
  }

  if (values.start_at && values.end_at) {
    const start = new Date(values.start_at)
    const end = new Date(values.end_at)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      errors.end_at = 'Enter a valid date and time.'
    } else if (end.getTime() <= start.getTime()) {
      errors.end_at = 'The end must be after the start.'
    } else if (end.getTime() - start.getTime() > MAX_LEAVE_SPAN_DAYS * 86_400_000) {
      errors.end_at = `A request cannot span more than ${MAX_LEAVE_SPAN_DAYS} days.`
    }
  }

  return errors
}

interface LeaveFormProps {
  initialValues?: Partial<LeaveFormValues>
  isSubmitting: boolean
  /** `intent` is "submit" to send the request for approval, "draft" to keep it. */
  onSubmit: (values: LeaveFormValues, intent: LeaveFormIntent) => void
  onCancel?: () => void
  submitLabel?: string
  secondaryLabel?: string
}

export default function LeaveForm({
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
  submitLabel = 'Submit request',
  secondaryLabel = 'Save as draft',
}: LeaveFormProps) {
  const [values, setValues] = useState<LeaveFormValues>({ ...EMPTY_VALUES, ...initialValues })
  const [errors, setErrors] = useState<FormErrors>({})

  const setField = <K extends keyof LeaveFormValues>(field: K, value: LeaveFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSubmit(values, 'submit')
  }

  const handleSaveDraft = () => {
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSubmit(values, 'draft')
  }

  return (
    <form onSubmit={handleSubmit} className="app-card space-y-5 p-5 md:p-6" noValidate>
      <Select
        label="Type of leave"
        options={TYPE_OPTIONS}
        value={values.request_type}
        onChange={(event) => setField('request_type', event.target.value as RequestType)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="From"
          type="datetime-local"
          value={values.start_at}
          onChange={(event) => setField('start_at', event.target.value)}
          error={errors.start_at}
        />
        <Input
          label="To"
          type="datetime-local"
          value={values.end_at}
          onChange={(event) => setField('end_at', event.target.value)}
          error={errors.end_at}
        />
      </div>

      <Input
        label="Destination"
        placeholder="Where are you going?"
        maxLength={MAX_DESTINATION_LENGTH}
        value={values.destination}
        onChange={(event) => setField('destination', event.target.value)}
        error={errors.destination}
        hint="Optional. Useful for event permissions and personal leave."
      />

      <Textarea
        label="Reason"
        placeholder="Explain the reason for your leave."
        maxLength={MAX_REASON_LENGTH}
        value={values.reason}
        onChange={(event) => setField('reason', event.target.value)}
        error={errors.reason}
        hint={`${values.reason.trim().length}/${MAX_REASON_LENGTH} characters`}
      />

      <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}

        <Button variant="secondary" onClick={handleSaveDraft} disabled={isSubmitting}>
          {secondaryLabel}
        </Button>

        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
