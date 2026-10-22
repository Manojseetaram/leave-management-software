import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import AppShell from '../common/AppShell'
import StudentSidebar from './StudentSidebar'
import StudentTopbar from './StudentTopbar'

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AppShell
      sidebar={
        <StudentSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      }
      topbar={<StudentTopbar onMenuClick={() => setSidebarOpen(true)} />}
    >
      <Outlet />
    </AppShell>
  )
}
