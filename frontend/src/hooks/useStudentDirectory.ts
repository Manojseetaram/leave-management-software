import { useMemo } from 'react'

import * as studentApi from '../api/studentApi'

import { useRequest } from './useRequest'

import type { StudentFilterStatus, StudentRecord } from '../types/student'

/** The backend caps `per_page` at 100, so one page is a full chunk of the roster. */
const PAGE_SIZE = 100

/** What the staff screens need to know about a student. */
export interface StudentDirectoryEntry {
  id: string
  full_name: string
  register_number: string
}

/** Every student the caller may see, keyed by the id on their leave requests. */
export type StudentDirectoryMap = Map<string, StudentDirectoryEntry>

const EMPTY_DIRECTORY: StudentDirectoryMap = new Map()

/**
 * Reads every page of a student list.
 *
 * The backend limits `per_page` to 100 and answers with the exact total, so
 * the number of pages is known before the second request is made.
 */
async function fetchAllStudents(status?: StudentFilterStatus): Promise<StudentRecord[]> {
  const first = await studentApi.list({ status, page: 1, per_page: PAGE_SIZE })
  const collected = [...first.items]

  const totalPages = Math.ceil(first.total / PAGE_SIZE)
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await studentApi.list({ status, page, per_page: PAGE_SIZE })
    collected.push(...next.items)
  }

  return collected
}

/**
 * Loads the student directory.
 *
 * Archived students are included by default: a leave request can belong to a
 * student who was archived after sending it, and the name is still needed to
 * show that request in a list.
 */
export async function loadStudentDirectory(options?: {
  includeArchived?: boolean
}): Promise<StudentDirectoryMap> {
  const includeArchived = options?.includeArchived ?? true

  const [current, archived] = await Promise.all([
    fetchAllStudents(),
    includeArchived ? fetchAllStudents('archived') : Promise.resolve<StudentRecord[]>([]),
  ])

  const byId: StudentDirectoryMap = new Map()
  for (const record of [...current, ...archived]) {
    byId.set(record.id, {
      id: record.id,
      full_name: record.full_name,
      register_number: record.register_number,
    })
  }

  return byId
}

/**
 * The label to show for a student in a list.
 *
 * A student who is not in the directory — archived after it was loaded, or
 * created since — is shown with a short id. A raw UUID would be unreadable,
 * but it is the only identification left.
 */
export function studentLabel(
  entry: StudentDirectoryEntry | undefined,
  studentId: string,
): string {
  if (entry) return `${entry.full_name} (${entry.register_number})`
  return `Student ${studentId.slice(0, 8)}`
}

export interface StudentDirectory {
  /** Every known student, keyed by their id. */
  byId: StudentDirectoryMap
  /** The entry for a student, when the directory knows them. */
  lookup: (studentId: string) => StudentDirectoryEntry | undefined
  /** The label to show for a student in a list. */
  label: (studentId: string) => string
  isLoading: boolean
  error: string | null
  /** Reads the directory again. */
  reload: () => void
}

/**
 * The student directory the staff screens use to name the owner of a leave
 * request. The backend does not put a name on a leave request, so the names
 * are read once and matched by id.
 */
export function useStudentDirectory(options?: {
  includeArchived?: boolean
}): StudentDirectory {
  const includeArchived = options?.includeArchived ?? true

  const { data, error, isLoading, reload } = useRequest<StudentDirectoryMap>(
    `student-directory:${includeArchived}`,
    () => loadStudentDirectory({ includeArchived }),
  )

  const byId = data ?? EMPTY_DIRECTORY

  return useMemo(
    () => ({
      byId,
      lookup: (studentId: string) => byId.get(studentId),
      label: (studentId: string) => studentLabel(byId.get(studentId), studentId),
      isLoading,
      error,
      reload,
    }),
    [byId, isLoading, error, reload],
  )
}
