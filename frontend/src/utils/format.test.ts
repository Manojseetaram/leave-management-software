import { describe, expect, it } from 'vitest'

import { daysBetween, formatDate, formatDateRange, fromDateTimeLocal, toDateTimeLocal } from './format'

describe('date helpers', () => {
  it('reads a UTC timestamp in the browser timezone', () => {
    // 2026-11-05T00:00:00Z
    const local = toDateTimeLocal('2026-11-05T00:00:00Z')
    expect(local).toMatch(/^2026-11-0[45]T\d{2}:\d{2}$/)
  })

  it('turns a local value back into the UTC ISO string the API expects', () => {
    const iso = fromDateTimeLocal('2026-12-10T09:00')
    expect(iso).toMatch(/^2026-12-10T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(new Date(iso).getTime()).toBe(new Date('2026-12-10T09:00').getTime())
  })

  it('round-trips a local value through the API format', () => {
    const local = '2026-12-10T09:00'
    expect(toDateTimeLocal(fromDateTimeLocal(local))).toBe(local)
  })

  it('leaves an unparsable value alone instead of producing an invalid date', () => {
    expect(fromDateTimeLocal('not-a-date')).toBe('not-a-date')
  })

  it('counts whole days between two timestamps', () => {
    expect(daysBetween('2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z')).toBe(2)
    expect(daysBetween('2026-09-01T00:00:00Z', '2026-09-01T23:59:59Z')).toBe(1)
    expect(daysBetween('2026-09-03T00:00:00Z', '2026-09-01T00:00:00Z')).toBe(-2)
  })

  it('returns zero for missing dates', () => {
    expect(daysBetween('', '2026-09-01T00:00:00Z')).toBe(0)
    expect(daysBetween('2026-09-01T00:00:00Z', '')).toBe(0)
  })

  it('shows an em dash when there is nothing to show', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('renders a range as both dates', () => {
    const range = formatDateRange('2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z')
    expect(range).toContain('—')
    expect(range.split('—')).toHaveLength(2)
  })
})
