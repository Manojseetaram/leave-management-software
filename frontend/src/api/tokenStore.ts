import type { MeResponse, Role, UserProfile } from '../types/auth'

/**
 * Session storage for the signed-in user.
 *
 * The backend issues a single bearer token with an absolute expiry; there is
 * no refresh token, so an expired session simply means "sign in again".
 * The store is an external mutable object exposed through
 * `useSyncExternalStore`, so any component can read the current session
 * without prop drilling or a context re-render cascade.
 */

const TOKEN_KEY = 'leave.token'
const USER_KEY = 'leave.user'
const ROLES_KEY = 'leave.roles'
const STUDENT_ID_KEY = 'leave.studentId'

export interface AuthState {
  token: string | null
  user: UserProfile | null
  roles: Role[]
  /** The student record id, when the signed-in user is a student. */
  studentId: string | null
}

type Listener = () => void

const EMPTY_STATE: AuthState = {
  token: null,
  user: null,
  roles: [],
  studentId: null,
}

function readRoles(raw: string | null): Role[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((role): role is Role =>
      role === 'admin' || role === 'hod' || role === 'faculty' || role === 'student',
    )
  } catch {
    return []
  }
}

function readUser(raw: string | null): UserProfile | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

function readState(): AuthState {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return EMPTY_STATE

  return {
    token,
    user: readUser(localStorage.getItem(USER_KEY)),
    roles: readRoles(localStorage.getItem(ROLES_KEY)),
    studentId: localStorage.getItem(STUDENT_ID_KEY),
  }
}

let state: AuthState = readState()
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

function persist(next: AuthState) {
  if (next.token) localStorage.setItem(TOKEN_KEY, next.token)
  else localStorage.removeItem(TOKEN_KEY)

  if (next.user) localStorage.setItem(USER_KEY, JSON.stringify(next.user))
  else localStorage.removeItem(USER_KEY)

  if (next.roles.length > 0) localStorage.setItem(ROLES_KEY, JSON.stringify(next.roles))
  else localStorage.removeItem(ROLES_KEY)

  if (next.studentId) localStorage.setItem(STUDENT_ID_KEY, next.studentId)
  else localStorage.removeItem(STUDENT_ID_KEY)
}

export const tokenStore = {
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  getState(): AuthState {
    return state
  },

  getToken(): string | null {
    return state.token
  },

  /** Stores the bearer token on its own, before the profile is known. */
  setToken(token: string) {
    state = { ...state, token }
    persist(state)
    notify()
  },

  /** Stores the token and the profile returned by GET /auth/me. */
  setSession(token: string, me: MeResponse) {
    state = {
      token,
      user: me.user,
      roles: me.roles,
      studentId: me.student_id,
    }
    persist(state)
    notify()
  },

  clear() {
    state = EMPTY_STATE
    persist(state)
    notify()
  },

  /** Re-reads from localStorage, used when another tab changes the session. */
  syncFromStorage() {
    state = readState()
    notify()
  },
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (
      event.key === TOKEN_KEY ||
      event.key === USER_KEY ||
      event.key === ROLES_KEY ||
      event.key === STUDENT_ID_KEY
    ) {
      tokenStore.syncFromStorage()
    }
  })
}
