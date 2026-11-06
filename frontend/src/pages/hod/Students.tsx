import { useState, type ChangeEvent } from 'react'
import { useRequest } from '../../hooks/useRequest'
import * as studentApi from '../../api/studentApi'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

import type { Paged } from '../../types/api'
import type {
  BulkImportResult,
  ImportRowResult,
  StudentListParams,
  StudentRecord,
  StudentStatus,
} from '../../types/student'

const PER_PAGE = 10

export default function Students() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StudentStatus | undefined>(undefined)
  const [page, setPage] = useState(1)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const filters: StudentListParams = { page, per_page: PER_PAGE, status, q: search || undefined }
  const { data, error, isLoading, reload } = useRequest<Paged<StudentRecord>>(
    `hod-students:${status ?? 'all'}:${page}:${search}`,
    () => studentApi.list(filters),
  )

  const [form, setForm] = useState({
    register_number: '',
    full_name: '',
    email: '',
    semester: '1',
    section: '',
    admission_year: '2026',
  })

  const create = async () => {
    setCreateError(null)
    try {
      await studentApi.create({
        register_number: form.register_number.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        semester: Number(form.semester),
        section: form.section.trim() || undefined,
        admission_year: Number(form.admission_year) || undefined,
      })
      setIsCreateOpen(false)
      setForm({ register_number: '', full_name: '', email: '', semester: '1', section: '', admission_year: '2026' })
      reload()
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : 'The student could not be created.')
    }
  }

  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const idx = (name: string) => header.indexOf(name)
    const rnIdx = idx('register_number') >= 0 ? idx('register_number') : idx('usn')
    const nameIdx = idx('full_name') >= 0 ? idx('full_name') : idx('name')
    const emailIdx = idx('email')
    const semIdx = idx('semester')
    const secIdx = idx('section')
    const yearIdx = idx('admission_year')
    if (rnIdx < 0 || nameIdx < 0) throw new Error('CSV needs register_number/usn and full_name/name columns.')
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim())
      return {
        register_number: cols[rnIdx] ?? '',
        full_name: cols[nameIdx] ?? '',
        email: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
        semester: semIdx >= 0 ? Number(cols[semIdx]) || 1 : 1,
        section: secIdx >= 0 ? cols[secIdx] || undefined : undefined,
        admission_year: yearIdx >= 0 ? Number(cols[yearIdx]) || undefined : undefined,
      }
    })
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportResult(null)
    setIsImporting(true)
    try {
      const text = await file.text()
      const students = parseCsv(text)
      const result = await studentApi.importStudents({ students, dry_run: false })
      setImportResult(result)
      setIsImportOpen(true)
      reload()
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : 'Import failed.')
      setIsImportOpen(true)
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, search and manage student accounts.</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            {isImporting ? 'Importing...' : 'Import CSV'}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void handleImportFile(event)} disabled={isImporting} />
          </label>
          <Button onClick={() => setIsCreateOpen(true)}>Create student</Button>
        </div>
      </header>

      <div className="app-card mb-4 grid gap-4 p-4 md:grid-cols-3">
        <Input label="Search" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }} placeholder="Register number, name or email" />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Status</span>
          <select
            value={status ?? ''}
            onChange={(event) => { setPage(1); setStatus(event.target.value as StudentStatus | undefined) }}
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
          </select>
        </label>
      </div>

      {isLoading ? <LoadingState label="Loading students..." /> : error ? (
        <div className="app-card"><ErrorState message={error} onRetry={reload} /></div>
      ) : !data || data.items.length === 0 ? (
        <div className="app-card"><EmptyState title="No students found" /></div>
      ) : (
        <>
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
                  {data.items.map((student) => (
                    <tr key={student.id} className="transition-colors hover:bg-muted/60">
                      <td className="px-4 py-3 font-medium text-foreground">{student.register_number}</td>
                      <td className="px-4 py-3 text-foreground">{student.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.department}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.semester}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3">
              <Pagination page={page} perPage={PER_PAGE} total={data.total} onPageChange={setPage} isLoading={isLoading} />
            </div>
          </div>
        </>
      )}

      <Modal isOpen={isCreateOpen} title="Create student" description="A temporary password is generated and shown once." onClose={() => setIsCreateOpen(false)}>
        <div className="space-y-4">
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <Input label="Register number" value={form.register_number} onChange={(event) => setForm({ ...form, register_number: event.target.value })} />
          <Input label="Full name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Semester" type="number" min={1} max={12} value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} />
            <Input label="Section" value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} />
            <Input label="Admission year" type="number" value={form.admission_year} onChange={(event) => setForm({ ...form, admission_year: event.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Close</Button>
            <Button onClick={() => void create()} disabled={createError !== null}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isImportOpen || importResult !== null || importError !== null} title="Student import" onClose={() => { setIsImportOpen(false); setImportError(null); setImportResult(null) }}>
        <div className="space-y-3">
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          {importResult && (
            <>
              <p className="text-sm text-foreground">
                Imported {importResult.succeeded} of {importResult.total} students.
              </p>
              <ul className="max-h-64 space-y-1 overflow-auto text-xs text-muted-foreground">
                {importResult.rows.map((row: ImportRowResult) => (
                  <li key={row.row}>
                    Row {row.row}: {row.status}
                    {row.register_number ? ` (${row.register_number})` : ''}
                    {row.error ? ` — ${row.error}` : ''}
                    {row.temporary_password ? ` — password: ${row.temporary_password}` : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => { setIsImportOpen(false); setImportError(null); setImportResult(null) }}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
