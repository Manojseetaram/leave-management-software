import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ApiError } from '../../api/client'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { useAuth } from '../../context/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Leave Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your email address or your register number.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="app-card space-y-4 p-6" noValidate>
          <Input
            label="Email or register number"
            name="login"
            type="text"
            autoComplete="username"
            required
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
