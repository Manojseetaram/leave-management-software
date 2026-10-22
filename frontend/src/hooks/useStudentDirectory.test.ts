import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as studentApi from '../api/studentApi'

import { loadStudentDirectory, studentLabel } from './useStudentDirectory'

import type { StudentRecord } from '../types/student'

vi.mock('../api/studentApi', () => ({
  list: vi.fn(),
}))

const mockList = vi.mocked(studentApi.list)

function student(index: number): StudentRecord {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    user_id: `11111111-1111-1111-1111-${String(index).padStart(12, '0')}`,
    register_number: `2021CS${String(index).padStart(3, '0')}`,
    full_name: `Student ${index}`,
    email: `student${index}@ise.edu`,
    department: 'ISE',
    semester: 5,
    section: 'A',
    admission_year: 2021,
    status: 'active',
    created_at: '2026-08-01T09:00:00Z',
    deleted_at: null,
  }
}

/** Answers like the backend: a page of records plus the exact total. */
function page(records: StudentRecord[], total: number, pageNumber: number) {
  return {
    items: records,
    total,
    page: pageNumber,
    per_page: 100,
  }
}

beforeEach(() => {
  mockList.mockReset()
})

describe('loadStudentDirectory', () => {
  /** The calls that read the current roster, without an archived filter. */
  const rosterCalls = () =>
    mockList.mock.calls.filter(([params]) => params?.status === undefined)

  it('reads a roster that fits on one page with a single request', async () => {
    mockList.mockImplementation(async (params) =>
      params?.status === 'archived' ? page([], 0, 1) : page([student(1), student(2)], 2, 1),
    )

    const directory = await loadStudentDirectory()

    expect(rosterCalls()).toHaveLength(1)
    expect(rosterCalls()[0][0]).toEqual({ status: undefined, page: 1, per_page: 100 })
    expect(directory.size).toBe(2)
    expect(directory.get(student(1).id)?.full_name).toBe('Student 1')
  })

  it('follows the pagination until the whole roster is read', async () => {
    // 250 students need three pages of 100.
    mockList.mockImplementation(async (params) => {
      if (params?.status === 'archived') return page([], 0, 1)

      const pageNumber = params?.page ?? 1
      const start = (pageNumber - 1) * 100
      const size = Math.min(100, 250 - start)
      const records = Array.from({ length: size }, (_, index) => student(start + index + 1))
      return page(records, 250, pageNumber)
    })

    const directory = await loadStudentDirectory()

    expect(rosterCalls()).toHaveLength(3)
    expect(rosterCalls().map(([params]) => params?.page)).toEqual([1, 2, 3])
    expect(directory.size).toBe(250)
  })

  it('asks for the archived students as well, so no request loses its owner', async () => {
    mockList.mockImplementation(async (params) => {
      if (params?.status === 'archived') return page([student(99)], 1, 1)
      return page([student(1)], 1, 1)
    })

    const directory = await loadStudentDirectory()

    const statuses = mockList.mock.calls.map(([params]) => params?.status)
    expect(statuses).toContain('archived')
    expect(directory.get(student(99).id)?.register_number).toBe('2021CS099')
  })

  it('can leave the archived students out', async () => {
    mockList.mockImplementation(async (params) =>
      params?.status === 'archived' ? page([], 0, 1) : page([student(1)], 1, 1),
    )

    const directory = await loadStudentDirectory({ includeArchived: false })

    const statuses = mockList.mock.calls.map(([params]) => params?.status)
    expect(statuses).not.toContain('archived')
    expect(directory.size).toBe(1)
  })

  it('returns an empty directory when there are no students', async () => {
    mockList.mockResolvedValue(page([], 0, 1))

    const directory = await loadStudentDirectory()

    expect(directory.size).toBe(0)
  })
})

describe('studentLabel', () => {
  it('shows the name and the register number', () => {
    expect(
      studentLabel(
        { id: 'a', full_name: 'Asha Student', register_number: '2021CS001' },
        'a',
      ),
    ).toBe('Asha Student (2021CS001)')
  })

  it('falls back to a short id instead of a raw uuid', () => {
    const id = '3f2a9b1c-4d5e-6789-abcd-ef0123456789'
    const label = studentLabel(undefined, id)

    expect(label).toBe('Student 3f2a9b1c')
    expect(label).not.toContain(id)
  })
})
