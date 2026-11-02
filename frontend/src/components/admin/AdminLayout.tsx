import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import AdminSidebar from './AdminSidebar'
import AppTopbar from '../common/AppTopbar'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell bg-background">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <AppTopbar title="Administration" onMenuClick={() => setSidebarOpen(true)} />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
