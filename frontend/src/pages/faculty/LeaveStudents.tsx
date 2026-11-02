import { useState } from 'react'
import { useRequest } from '../../hooks/useRequest'
import * as facultyApi from '../../api/facultyApi'
import Badge from '../../components/common/Badge'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import Button from '../../components/common/Button'

import type { FacultyStudent } from '../../types/faculty'

const PER_PAGE = 10

export default function FacultyStudents() {
  const [search, setSearch] = useState('')
  const [semester, setSemester] = useState('')
  const [section, setSection] = useState('')
  const [page, setPage] = useState(1)

  const { data, error, isLoading, reload } = useRequest(
    `faculty:students:${search}:${semester}:${section}:${page}`,
    () =>
      facultyApi.students({
        q: search || undefined,
        semester: semester ? Number(semester) : undefined,
        section: section || undefined,
        page,
        per_page: PER_PAGE,
      }),
  )

  const closeFilters = () => {
    setSearch('')
    setSemester('')
    setSection('')
    setPage(1)
  }

  const items = (data?.items ?? []) as FacultyStudent[]
  const total = data?.total ?? 0

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Faculty roster</h1>
          <p className="mt-1 text-sm text-muted-foreground">Students permitted for the faculty role.</p>
        </div>
        <Button variant="secondary" onClick={closeFilters}>Reset filters</Button>
      </header>

      <div className="app-card mb-4 grid gap-4 p-4 md:grid-cols-3">
        <Input label="Search" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }} placeholder="Register number, name or department" />
        <Select label="Semester" value={semester} onChange={(event) => { setPage(1); setSemester(event.target.value) }} options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: `Semester ${index + 1}` }))} />
        <Input label="Section" value={section} onChange={(event) => { setPage(1); setSection(event.target.value) }} placeholder="A/B" />
      </div>

      {isLoading ? (
        <LoadingState label="Loading faculty students..." />
      ) : error ? (
        <div className="app-card"><ErrorState message={error} onRetry={reload} /></div>
      ) : items.length === 0 ? (
        <div className="app-card"><EmptyState title="No students found" /></div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Register</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Semester</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{student.register_number}</td>
                    <td className="px-4 py-3 text-foreground">{student.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.department}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.semester}</td>
                    <td className="px-4 py-3"><Badge status={student.status as never} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3">
            <Pagination page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  )
}
