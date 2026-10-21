import { Award, ChartColumn, ClipboardList, LayoutDashboard, Users } from 'lucide-react'

import AppSidebar, { type NavItem } from '../common/AppSidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/hod/dashboard', icon: LayoutDashboard },
  { label: 'Leave requests', to: '/hod/requests', icon: ClipboardList },
  { label: 'Students', to: '/hod/students', icon: Users },
  { label: 'Reports', to: '/hod/reports', icon: ChartColumn },
  { label: 'Certificates', to: '/hod/certificates', icon: Award },
]

interface HodSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function HodSidebar({ isOpen, onClose }: HodSidebarProps) {
  return (
    <AppSidebar
      title="HOD Console"
      items={NAV_ITEMS}
      isOpen={isOpen}
      onClose={onClose}
    />
  )
}
