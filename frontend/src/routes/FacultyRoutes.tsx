import { Navigate, Route, Routes } from 'react-router-dom'

import FacultyLayout from '../components/faculty/FacultyLayout'

import Dashboard from '../pages/faculty/Dashboard'
import FacultyRequests from '../pages/faculty/FacultyRequests'
import FacultyStudents from '../pages/faculty/LeaveStudents'

export default function FacultyRoutes() {
  return (
    <Routes>
      <Route element={<FacultyLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<FacultyStudents />} />
        <Route path="requests" element={<FacultyRequests />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}
