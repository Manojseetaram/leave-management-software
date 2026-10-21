/** Authentication and session types (crates/api/src/handlers/auth.rs). */

/** The roles the backend understands (crates/domain/src/principal.rs). */
export type Role = 'admin' | 'hod' | 'faculty' | 'student'

export interface UserProfile {
  id: string
  email: string | null
  full_name: string
  status: string
  must_change_password: boolean
}

/** Staff log in with an email address, students with a register number. */
export interface LoginPayload {
  login: string
  password: string
}

export interface LoginResponse {
  token: string
  token_type: 'Bearer'
  /** Absolute ISO-8601 expiry of the session. */
  expires_at: string
  must_change_password: boolean
}

/** The payload of GET /auth/me. */
export interface MeResponse {
  user: UserProfile
  roles: Role[]
  /** Set when the caller is a student; identifies their student record. */
  student_id: string | null
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface SessionInfo {
  id: string
  created_at: string
  expires_at: string
}

/** The value published by the AuthContext. */
export interface AuthContextValue {
  user: UserProfile | null
  roles: Role[]
  /** The student record id, when the signed-in user is a student. */
  studentId: string | null
  isAuthenticated: boolean
  /** True while the stored session is being restored on first render. */
  isLoading: boolean
  /** True while the user still has to replace their temporary password. */
  mustChangePassword: boolean
  /** Only the HOD holds `leave:approve`, so only the HOD may decide requests. */
  canDecideRequests: boolean
  /** The route the user lands on after signing in. */
  homePath: string
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  changePassword: (payload: ChangePasswordPayload) => Promise<void>
  refreshProfile: () => Promise<void>
}
