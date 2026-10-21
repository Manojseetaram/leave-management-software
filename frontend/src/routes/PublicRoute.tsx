import { Navigate, Outlet } from 'react-router-dom'

import LoadingScreen from '../components/common/LoadingScreen'
import { useAuth } from '../context/useAuth'

/** Keeps signed-in users out of the login page. */
export default function PublicRoute() {
  const { isAuthenticated, isLoading, homePath } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate to={homePath} replace />
  }

  return <Outlet />
}
