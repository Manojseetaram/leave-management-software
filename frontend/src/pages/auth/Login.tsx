import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, ClipboardList, Clock, User } from 'lucide-react'

import { ApiError } from '../../api/client'
import AuthShell from '../../components/auth/AuthShell'
import Button from '../../components/common/Button'
import Callout from '../../components/common/Callout'
import Input from '../../components/common/Input'
import PasswordInput from '../../components/common/PasswordInput'
import { useAuth } from '../../context/useAuth'

const FEATURES = [
  { icon: ClipboardList, text: 'Submit and track every leave request' },
  { icon: CheckCircle2, text: 'Approvals from the Head of Department' },
  { icon: Clock, text: 'A complete history for the department' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ login?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    // The empty fields are caught here, so the server is never asked to
    // check a request that cannot possibly succeed.
    const found: { login?: string; password?: string } = {}
    if (!loginId.trim()) found.login = 'Enter your email address or register number.'
    if (!password) found.password = 'Enter your password.'

    setFieldErrors(found)
    if (Object.keys(found).length > 0) return

    setIsSubmitting(true)

    try {
      await login({ login: loginId, password })
      toast.success('Signed in successfully')
      // The landing page routes to the console of the signed-in role.
      navigate(from ?? '/', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Sign in failed. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateLoginId = (value: string) => {
    setLoginId(value)
    setFieldErrors((current) => ({ ...current, login: undefined }))
    setError(null)
  }

  const updatePassword = (value: string) => {
    setPassword(value)
    setFieldErrors((current) => ({ ...current, password: undefined }))
    setError(null)
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your department email address or your register number to continue."
      headline="Every leave request, tracked and approved in one place."
      description="The leave and permission management system of the Information Science & Engineering department."
      features={FEATURES}
      footer="Information Science & Engineering"
    >
      <form onSubmit={handleSubmit} className="app-card space-y-5 p-6 sm:p-8" noValidate>
        <Input
          label="Email or register number"
          name="login"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          leadingIcon={User}
          disabled={isSubmitting}
          value={loginId}
          onChange={(event) => updateLoginId(event.target.value)}
          error={fieldErrors.login}
        />

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          disabled={isSubmitting}
          value={password}
          onChange={(event) => updatePassword(event.target.value)}
          error={fieldErrors.password}
        />

        {error && (
          <Callout tone="danger" role="alert" title="We could not sign you in">
            {error}
          </Callout>
        )}

        <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Staff sign in with their department email address. Students sign in
          with their register number.
        </p>
      </form>
    </AuthShell>
  )
}
