import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import * as authApi from '../api/authApi'
import { PASSWORD_CHANGE_REQUIRED_EVENT, UNAUTHORIZED_EVENT } from '../api/client'
import { tokenStore } from '../api/tokenStore'

import { AuthContext } from './useAuth'

import type { AuthContextValue } from '../types/auth'
import type { ChangePasswordPayload, LoginPayload, Role } from '../types/auth'

interface AuthProviderProps {
  children: ReactNode
}

/** The route the user lands on after signing in. */
function homePathFor(roles: Role[]): string {
  if (roles.includes('hod')) return '/hod'
  if (roles.includes('faculty')) return '/faculty'
  if (roles.includes('student')) return '/student'
  if (roles.includes('admin')) return '/hod'
  return '/login'
}

export function AuthProvider({ children }: AuthProviderProps) {
  const session = useSyncExternalStore(
    tokenStore.subscribe,
    tokenStore.getState,
    tokenStore.getState,
  )

  const [isLoading, setIsLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    const result = await authApi.login(payload)

    // The token has to be in place before /auth/me can be called.
    tokenStore.setToken(result.token)
    setMustChangePassword(result.must_change_password)

    const profile = await authApi.me()
    tokenStore.setSession(result.token, profile)
    setMustChangePassword(profile.user.must_change_password)
  }, [])

  const refreshProfile = useCallback(async (): Promise<void> => {
    const token = tokenStore.getToken()
    if (!token) {
      tokenStore.clear()
      return
    }

    const profile = await authApi.me()
    tokenStore.setSession(token, profile)
    setMustChangePassword(profile.user.must_change_password)
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout()
    } catch {
      // The session is discarded locally even when the backend call fails.
    } finally {
      tokenStore.clear()
      setMustChangePassword(false)
    }
  }, [])

  const changePassword = useCallback(
    async (payload: ChangePasswordPayload): Promise<void> => {
      await authApi.changePassword(payload)
      await refreshProfile()
    },
    [refreshProfile],
  )

  /*
   * Restores the session on first render: a stored token is only trusted
   * after GET /auth/me confirms it is still valid.
   */
  useEffect(() => {
    const restore = async () => {
      try {
        const token = tokenStore.getToken()
        if (!token) return

        const profile = await authApi.me()
        tokenStore.setSession(token, profile)
        setMustChangePassword(profile.user.must_change_password)
      } catch {
        tokenStore.clear()
      } finally {
        setIsLoading(false)
      }
    }

    void restore()
  }, [])

  /*
   * A rejected token anywhere in the app signs the user out. A pending
   * password change is not a rejection: the session stays valid, but the
   * backend refuses every route that needs a fully set up account.
   */
  useEffect(() => {
    const onUnauthorized = () => {
      tokenStore.clear()
      setMustChangePassword(false)
    }

    const onPasswordChangeRequired = () => {
      setMustChangePassword(true)
    }

    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    window.addEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, onPasswordChangeRequired)

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
      window.removeEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, onPasswordChangeRequired)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.user,
      roles: session.roles,
      studentId: session.studentId,
      isAuthenticated: Boolean(session.token && session.user),
      isLoading,
      mustChangePassword,
      canDecideRequests: session.roles.includes('hod'),
      homePath: homePathFor(session.roles),
      login,
      logout,
      changePassword,
      refreshProfile,
    }),
    [session, isLoading, mustChangePassword, login, logout, changePassword, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
