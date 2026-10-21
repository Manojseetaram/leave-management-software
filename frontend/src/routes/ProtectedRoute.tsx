import { Navigate, Outlet, useLocation } from 'react-router-dom'

import LoadingScreen from '../components/common/LoadingScreen'
import { useAuth } from '../context/useAuth'

/**
 * Guards every authenticated area: waits for the session to be restored,
 * sends anonymous visitors to the login page and forces users with a
 * temporary password onto the change-password page.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen label="Loading secure session..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}
