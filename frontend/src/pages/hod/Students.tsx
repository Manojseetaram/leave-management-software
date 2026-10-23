import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'

import * as studentApi from '../../api/studentApi'

import Button from '../../components/common/Button'
import FilterChip from '../../components/common/FilterChip'
import Input from '../../components/common/Input'
import PageHeader from '../../components/common/PageHeader'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import StudentTable from '../../components/hod/StudentTable'

import { useRequest } from '../../hooks/useRequest'

import { STUDENT_STATUSES, STUDENT_STATUS_LABELS } from '../../utils/student'

import type { Paged } from '../../types/api'
import type { StudentFilterStatus, StudentRecord } from '../../types/student'

const PER_PAGE = 20

export default function Students() {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [status, setStatus] = useState<StudentFilterStatus | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, error, isLoading, reload } = useRequest<Paged<StudentRecord>>(
    `${appliedQuery}:${status ?? 'all'}:${page}`,
    () =>
      studentApi.list({
        q: appliedQuery || undefined,
        status,
        page,
        per_page: PER_PAGE,
      }),
  )

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setAppliedQuery(query.trim())
  }

  const selectStatus = (next: StudentFilterStatus | undefined) => {
    setStatus(next)
    setPage(1)
  }

  const clearFilters = () => {
    setQuery('')
    setAppliedQuery('')
    selectStatus(undefined)
  }

  const students = data?.items ?? []
  const isFiltered = appliedQuery.length > 0 || status !== undefined

  return (
    <div className="app-page">
      <PageHeader
        title="Students"
        description="Search the roster by register number or name, and see the state of every student account."
      />

      <div className="app-card mb-5 p-4">
        <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <Input
              label="Search"
              placeholder="Register number or name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <Button type="submit" isLoading={isLoading}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Button>
        </form>

        <div
          role="group"
          aria-label="Filter students by status"
          className="mt-4 flex flex-wrap gap-2"
        >
          <FilterChip
            label="All"
            active={status === undefined}
            onClick={() => selectStatus(undefined)}
          />

          {STUDENT_STATUSES.map((value) => (
            <FilterChip
              key={value}
              label={STUDENT_STATUS_LABELS[value]}
              active={status === value}
              onClick={() => selectStatus(value)}
            />
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading the roster..." />
      ) : error ? (
        <div className="app-card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : students.length === 0 ? (
        <div className="app-card">
          <EmptyState
            title={isFiltered ? 'No student matches' : 'No students yet'}
            description={
              isFiltered
                ? 'The search found nothing. Try another register number, name or status.'
                : 'No student account has been created yet.'
            }
            action={
              isFiltered ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear the filters
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <StudentTable students={students} caption="Student roster" />

          {data && (
            <div className="app-card mt-4">
              <Pagination
                page={data.page}
                perPage={data.per_page}
                total={data.total}
                onPageChange={setPage}
                isLoading={isLoading}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
