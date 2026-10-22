import { useState, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'

import * as facultyApi from '../../api/facultyApi'

import Button from '../../components/common/Button'
import FilterChip from '../../components/common/FilterChip'
import Input from '../../components/common/Input'
import LeaveRequestTable from '../../components/common/LeaveRequestTable'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import FacultyNotice from '../../components/faculty/FacultyNotice'
import FacultyStudentTable from '../../components/faculty/FacultyStudentTable'

import { useRequest } from '../../hooks/useRequest'

import { FACULTY_SEMESTERS, isEndpointUnavailable, semesterLabel } from '../../utils/faculty'
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS } from '../../utils/leave'

import type { Paged } from '../../types/api'
import type { FacultyStudentSummary } from '../../types/faculty'
import type { LeaveRequest, RequestStatus } from '../../types/leave'

const PER_PAGE = 20

/**
 * The students a faculty member may read, and their leave requests.
 *
 * The console is read-only — the decisions belong to the HOD — and it is
 * written against the contract in docs/faculty-api-contract.md. While the
 * backend does not serve those two routes the screen says so instead of
 * showing an empty roster.
 */
export default function LeaveStudents() {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [semester, setSemester] = useState<number | undefined>(undefined)
  const [section, setSection] = useState('')
  const [appliedSection, setAppliedSection] = useState('')
  const [rosterPage, setRosterPage] = useState(1)

  const [status, setStatus] = useState<RequestStatus | undefined>(undefined)
  const [requestsPage, setRequestsPage] = useState(1)
  const [selected, setSelected] = useState<FacultyStudentSummary | null>(null)

  const {
    data: roster,
    error: rosterError,
    failure: rosterFailure,
    isLoading: isRosterLoading,
    reload: reloadRoster,
  } = useRequest<Paged<FacultyStudentSummary>>(
    `${appliedQuery}:${semester ?? 'all'}:${appliedSection}:${rosterPage}`,
    () =>
      facultyApi.students({
        q: appliedQuery || undefined,
        semester,
        section: appliedSection || undefined,
        page: rosterPage,
        per_page: PER_PAGE,
      }),
  )

  const {
    data: requests,
    error: requestsError,
    failure: requestsFailure,
    isLoading: isRequestsLoading,
    reload: reloadRequests,
  } = useRequest<Paged<LeaveRequest>>(
    `${status ?? 'all'}:${selected?.id ?? 'all'}:${requestsPage}`,
    () =>
      facultyApi.leaveRequests({
        status,
        student_id: selected?.id,
        page: requestsPage,
        per_page: PER_PAGE,
      }),
  )

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRosterPage(1)
    setAppliedQuery(query.trim())
    setAppliedSection(section.trim())
  }

  const clearFilters = () => {
    setQuery('')
    setAppliedQuery('')
    setSection('')
    setAppliedSection('')
    setSemester(undefined)
    setRosterPage(1)
  }

  const showRequestsFor = (student: FacultyStudentSummary) => {
    setSelected(student)
    setRequestsPage(1)
  }

  const students = roster?.items ?? []
  const leaveRequests = requests?.items ?? []
  const isFiltered = appliedQuery.length > 0 || semester !== undefined || appliedSection.length > 0

  // The leave request carries a student id but no name. The names come from
  // the roster: the page that is loaded, and the student that was picked.
  const namesById = new Map(students.map((student) => [student.id, student.full_name]))
  const nameOf = (studentId: string) =>
    namesById.get(studentId) ?? (selected?.id === studentId ? selected.full_name : undefined)

  // The Faculty routes are not in the router yet. A 404 or a 403 both mean
  // the same thing here: the console cannot read the roster.
  const unavailable =
    isEndpointUnavailable(rosterFailure) || isEndpointUnavailable(requestsFailure)

  if (unavailable) {
    return (
      <div className="app-page">
        <header className="page-header">
          <div>
            <h1 className="text-page-title">Student requests</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The students you may read and the leave requests they sent.
            </p>
          </div>
        </header>

        <FacultyNotice
          title="The Faculty roster is not available yet"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                reloadRoster()
                reloadRequests()
              }}
            >
              Try again
            </Button>
          }
        >
          The backend gives a faculty member no readable endpoint for students and
          their leave requests: the role holds only the `students:read` permission,
          which no handler uses. The two routes this screen is written against —
          <code className="mx-1">GET /faculty/students</code> and
          <code className="mx-1">GET /faculty/leave-requests</code> — are specified in
          <code className="mx-1">docs/faculty-api-contract.md</code> and are not in the
          router yet. The screen picks the data up as soon as they exist.
        </FacultyNotice>
      </div>
    )
  }

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Student requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The students you may read and the leave requests they sent. Deciding a
            request belongs to the Head of Department.
          </p>
        </div>
      </header>

      <section>
        <h2 className="text-section-title mb-3">Students</h2>

        <div className="app-card mb-4 p-4">
          <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1">
              <Input
                label="Search"
                placeholder="Register number or name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="w-40">
              <Select
                label="Semester"
                placeholder="Every semester"
                value={semester === undefined ? '' : String(semester)}
                onChange={(event) =>
                  setSemester(
                    event.target.value === '' ? undefined : Number(event.target.value),
                  )
                }
                options={FACULTY_SEMESTERS.map((value) => ({
                  value: String(value),
                  label: semesterLabel(value),
                }))}
              />
            </div>

            <div className="w-36">
              <Input
                label="Section"
                placeholder="A"
                value={section}
                onChange={(event) => setSection(event.target.value)}
              />
            </div>

            <Button type="submit" isLoading={isRosterLoading}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </Button>
          </form>
        </div>

        {isRosterLoading ? (
          <LoadingState label="Loading the roster..." />
        ) : rosterError ? (
          <div className="app-card">
            <ErrorState message={rosterError} onRetry={reloadRoster} />
          </div>
        ) : students.length === 0 ? (
          <div className="app-card">
            <EmptyState
              title={isFiltered ? 'No student matches' : 'No students yet'}
              description={
                isFiltered
                  ? 'The search found nothing. Try another register number, name, semester or section.'
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
            <FacultyStudentTable
              students={students}
              caption="Student roster"
              onShowRequests={showRequestsFor}
            />

            {roster && (
              <div className="app-card mt-4">
                <Pagination
                  page={roster.page}
                  perPage={roster.per_page}
                  total={roster.total}
                  onPageChange={setRosterPage}
                  isLoading={isRosterLoading}
                />
              </div>
            )}
          </>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-section-title">Leave requests</h2>

          {selected && (
            <button
              type="button"
              onClick={() => {
                setSelected(null)
                setRequestsPage(1)
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {selected.full_name}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filter the leave requests by status"
          className="mb-4 flex flex-wrap gap-2"
        >
          <FilterChip
            label="All"
            active={status === undefined}
            onClick={() => {
              setStatus(undefined)
              setRequestsPage(1)
            }}
          />

          {REQUEST_STATUSES.map((value) => (
            <FilterChip
              key={value}
              label={REQUEST_STATUS_LABELS[value]}
              active={status === value}
              onClick={() => {
                setStatus(value)
                setRequestsPage(1)
              }}
            />
          ))}
        </div>

        {isRequestsLoading ? (
          <LoadingState label="Loading the leave requests..." />
        ) : requestsError ? (
          <div className="app-card">
            <ErrorState message={requestsError} onRetry={reloadRequests} />
          </div>
        ) : leaveRequests.length === 0 ? (
          <div className="app-card">
            <EmptyState
              title="No leave request"
              description={
                selected
                  ? `${selected.full_name} has not sent a leave request in this state.`
                  : 'No student on the roster has sent a leave request in this state.'
              }
            />
          </div>
        ) : (
          <>
            <LeaveRequestTable
              requests={leaveRequests}
              caption="Leave requests of the roster"
              linkBase={null}
              student={(request) => nameOf(request.student_id)}
            />

            {requests && (
              <div className="app-card mt-4">
                <Pagination
                  page={requests.page}
                  perPage={requests.per_page}
                  total={requests.total}
                  onPageChange={setRequestsPage}
                  isLoading={isRequestsLoading}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
