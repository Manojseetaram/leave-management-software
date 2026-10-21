import { Navigate, Route, Routes } from 'react-router-dom'

import StudentLayout from '../components/student/StudentLayout'

import ApplyLeave from '../pages/student/ApplyLeave'
import Dashboard from '../pages/student/Dashboard'
import LeaveDetails from '../pages/student/LeaveDetails'
import LeaveHistory from '../pages/student/LeaveHistory'
import Profile from '../pages/student/Profile'

export default function StudentRoutes() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="apply" element={<ApplyLeave />} />
        <Route path="history" element={<LeaveHistory />} />
        <Route path="requests/:id" element={<LeaveDetails />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}
