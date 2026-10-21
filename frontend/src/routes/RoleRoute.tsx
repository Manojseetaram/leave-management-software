import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../context/useAuth'

import type { Role } from '../types/auth'

interface RoleRouteProps {
  /** The roles allowed into the wrapped routes. */
  roles: Role[]
}

/**
 * Restricts a branch of the route tree to specific roles. A user without one
 * of the roles is sent back to the landing page of their own role.
 */
export default function RoleRoute({ roles }: RoleRouteProps) {
  const { roles: currentRoles, homePath } = useAuth()

  if (!roles.some((role) => currentRoles.includes(role))) {
    return <Navigate to={homePath} replace />
  }

  return <Outlet />
}
