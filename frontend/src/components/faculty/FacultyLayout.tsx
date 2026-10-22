import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import AppShell from '../common/AppShell'
import FacultySidebar from './FacultySidebar'
import FacultyTopbar from './FacultyTopbar'

export default function FacultyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AppShell
      sidebar={
        <FacultySidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      }
      topbar={<FacultyTopbar onMenuClick={() => setSidebarOpen(true)} />}
    >
      <Outlet />
    </AppShell>
  )
}
