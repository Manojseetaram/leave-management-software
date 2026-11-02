import { Navigate, Route, Routes } from 'react-router-dom'

import AdminLayout from '../components/admin/AdminLayout'

import AdminAudit from '../pages/admin/Audit'
import AdminCertificates from '../pages/admin/AdminCertificates'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminLeaveRequests from '../pages/admin/AdminLeaveRequests'
import AdminNotifications from '../pages/admin/Notifications'
import AdminReports from '../pages/admin/AdminReports'
import AdminStaff from '../pages/admin/Staff'
import AdminStudents from '../pages/admin/AdminStudents'

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="requests" element={<AdminLeaveRequests />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}
