import { useState } from 'react'
import * as hodApi from '../../api/hodApi'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import type { CreatedStaff, NewStaffUser } from '../../types/hod'

export default function AdminStaff() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roles, setRoles] = useState<string[]>(['hod'])
  const [formError, setFormError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedStaff | null>(null)

  const toggleRole = (role: string) => {
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  const create = async () => {
    setFormError(null)
    const body: NewStaffUser = {
      email: email.trim(),
      full_name: fullName.trim(),
      roles: roles as NewStaffUser['roles'],
    }
    try {
      const result = await hodApi.createStaff(body)
      setCreated(result)
      setEmail('')
      setFullName('')
      setRoles(['hod'])
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'The staff account could not be created.')
    }
  }

  return (
    <div className="app-page">
      <header className="page-header">
        <div>
          <h1 className="text-page-title">Staff accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create HOD or faculty accounts with temporary passwords.</p>
        </div>
      </header>

      <div className="app-card p-5">
        {formError && <p className="mb-4 text-sm text-destructive">{formError}</p>}
        <div className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <fieldset className="flex flex-wrap gap-3">
            {(['hod', 'faculty'] as const).map((role) => (
              <label key={role} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                {role}
              </label>
            ))}
          </fieldset>
          <div>
            <Button onClick={() => void create()} disabled={roles.length === 0}>Create staff account</Button>
          </div>
        </div>
      </div>

      <Modal isOpen={created !== null} title="Staff account created" onClose={() => setCreated(null)}>
        {created ? (
          <div className="space-y-3">
            <p>The temporary password is shown once. Ask the account holder to change it immediately.</p>
            <p><strong>Password:</strong> {created.temporary_password}</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setCreated(null)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
