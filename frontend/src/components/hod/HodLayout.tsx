import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import AppShell from '../common/AppShell'
import HodSidebar from './HodSidebar'
import HodTopbar from './HodTopbar'

export default function HodLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AppShell
      sidebar={
        <HodSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      }
      topbar={<HodTopbar onMenuClick={() => setSidebarOpen(true)} />}
    >
      <Outlet />
    </AppShell>
  )
}
