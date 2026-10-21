import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import StudentSidebar from './StudentSidebar'
import StudentTopbar from './StudentTopbar'

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell bg-background">
      <StudentSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-72">
        <StudentTopbar onMenuClick={() => setSidebarOpen(true)} />

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
