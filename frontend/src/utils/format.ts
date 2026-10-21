/**
 * Date helpers.
 *
 * The backend stores every timestamp as a UTC RFC-3339 string
 * (`DateTime<Utc>`), while the forms use `datetime-local` inputs, which carry
 * no timezone and are read in the browser's local time.
 */

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** A readable local date and time, or an em dash when there is no value. */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleString(undefined, DATE_TIME_OPTIONS)
}

/** A readable local date, or an em dash when there is no value. */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString(undefined, DATE_OPTIONS)
}

/** The two dates of a request as a single readable range. */
export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} — ${formatDate(end)}`
}

/** The UTC ISO string into the local value a `datetime-local` input expects. */
export function toDateTimeLocal(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return ''

  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

/** A `datetime-local` input value into the UTC ISO string the API expects. */
export function fromDateTimeLocal(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString()
}

/** The number of whole days between two timestamps. */
export function daysBetween(start: string, end: string): number {
  const from = toDate(start)
  const to = toDate(end)
  if (!from || !to) return 0
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}
