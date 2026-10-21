import { Navigate, Route, Routes } from 'react-router-dom'

import HodRoutes from './HodRoutes'
import FacultyRoutes from './FacultyRoutes'
import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'
import RoleRoute from './RoleRoute'
import StudentRoutes from './StudentRoutes'

import LoadingScreen from '../components/common/LoadingScreen'
import { useAuth } from '../context/useAuth'

import ChangePassword from '../pages/auth/ChangePassword'
import Login from '../pages/auth/Login'

function HomeRedirect() {
  const { isAuthenticated, isLoading, mustChangePassword, homePath } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  return <Navigate to={homePath} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePassword />} />

        <Route element={<RoleRoute roles={['student']} />}>
          <Route path="/student/*" element={<StudentRoutes />} />
        </Route>

        <Route element={<RoleRoute roles={['hod', 'admin']} />}>
          <Route path="/hod/*" element={<HodRoutes />} />
        </Route>

        <Route element={<RoleRoute roles={['faculty']} />}>
          <Route path="/faculty/*" element={<FacultyRoutes />} />
        </Route>
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
