import { Navigate, Route, Routes } from 'react-router-dom'

import HodLayout from '../components/hod/HodLayout'

import Certificates from '../pages/hod/Certificates'
import Dashboard from '../pages/hod/Dashboard'
import LeaveDetails from '../pages/hod/LeaveDetails'
import LeaveRequests from '../pages/hod/LeaveRequests'
import Reports from '../pages/hod/Reports'
import Students from '../pages/hod/Students'

export default function HodRoutes() {
  return (
    <Routes>
      <Route element={<HodLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="requests" element={<LeaveRequests />} />
        <Route path="requests/:id" element={<LeaveDetails />} />
        <Route path="students" element={<Students />} />
        <Route path="reports" element={<Reports />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}
