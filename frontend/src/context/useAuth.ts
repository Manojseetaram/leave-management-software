import { createContext, useContext } from 'react'

import type { AuthContextValue } from '../types/auth'

/**
 * The context object lives here, next to the hook that reads it, so that
 * `AuthContext.tsx` only exports a component and Fast Refresh keeps working.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

/** Reads the current session. Must be used inside AuthProvider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
