import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import HodSidebar from './HodSidebar'
import HodTopbar from './HodTopbar'

export default function HodLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell bg-background">
      <HodSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-72">
        <HodTopbar onMenuClick={() => setSidebarOpen(true)} />

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
