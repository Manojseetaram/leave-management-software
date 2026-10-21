import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import FacultySidebar from './FacultySidebar'
import FacultyTopbar from './FacultyTopbar'

export default function FacultyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell bg-background">
      <FacultySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-72">
        <FacultyTopbar onMenuClick={() => setSidebarOpen(true)} />

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
