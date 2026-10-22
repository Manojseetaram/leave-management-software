import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react'

import { ApiError } from '../../api/client'
import AuthShell from '../../components/auth/AuthShell'
import Button from '../../components/common/Button'
import Callout from '../../components/common/Callout'
import PasswordInput from '../../components/common/PasswordInput'
import { useAuth } from '../../context/useAuth'

const FEATURES = [
  { icon: ShieldCheck, text: 'A password only you know' },
  { icon: Lock, text: 'Your other sessions are signed out' },
  { icon: CheckCircle2, text: 'Your account is fully set up afterwards' },
]

/**
 * The backend refuses every route that needs a fully set up account while a
 * temporary password is in use, so this page is mandatory rather than
 * optional: it is the only screen a first-time user can reach.
 */
export default function ChangePassword() {
  const { changePassword, user } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const found: typeof fieldErrors = {}
    if (!currentPassword) found.currentPassword = 'Enter your current password.'
    if (!newPassword) found.newPassword = 'Enter a new password.'
    if (!confirmPassword) found.confirmPassword = 'Type the new password again.'
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      found.confirmPassword = 'The new passwords do not match.'
    }

    setFieldErrors(found)
    if (Object.keys(found).length > 0) return

    setIsSubmitting(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      toast.success('Password updated')
      navigate('/', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The password could not be changed. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearError = (field: keyof typeof fieldErrors) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError(null)
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle={
        user
          ? `${user.full_name}, you are still using a temporary password.`
          : 'You are still using a temporary password.'
      }
      headline="Replace the temporary password before you carry on."
      description="Your account is only fully set up once the temporary password has been changed. Every other session is signed out when it is."
      features={FEATURES}
      footer="Information Science & Engineering"
    >
      <form onSubmit={handleSubmit} className="app-card space-y-5 p-6 sm:p-8" noValidate>
        <PasswordInput
          label="Current password"
          name="current_password"
          autoComplete="current-password"
          required
          disabled={isSubmitting}
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value)
            clearError('currentPassword')
          }}
          error={fieldErrors.currentPassword}
        />

        <PasswordInput
          label="New password"
          name="new_password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value)
            clearError('newPassword')
          }}
          error={fieldErrors.newPassword}
        />

        <PasswordInput
          label="Confirm new password"
          name="confirm_password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            clearError('confirmPassword')
          }}
          error={fieldErrors.confirmPassword}
        />

        {error && (
          <Callout tone="danger" role="alert" title="The password was not changed">
            {error}
          </Callout>
        )}

        <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
          {isSubmitting ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  )
}
