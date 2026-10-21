import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ApiError } from '../../api/client'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { useAuth } from '../../context/useAuth'

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
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user
              ? `${user.full_name}, you are still using a temporary password.`
              : 'You are still using a temporary password.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="app-card space-y-4 p-6" noValidate>
          <Input
            label="Current password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />

          <Input
            label="New password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />

          <Input
            label="Confirm new password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Update password
          </Button>
        </form>
      </div>
    </div>
  )
}
