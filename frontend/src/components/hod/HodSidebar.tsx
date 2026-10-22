import { Award, ChartColumn, ClipboardList, LayoutDashboard, Users } from 'lucide-react'

import AppSidebar, { type NavItem } from '../common/AppSidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/hod/dashboard', icon: LayoutDashboard, group: 'Overview' },
  { label: 'Leave requests', to: '/hod/requests', icon: ClipboardList, group: 'Approvals' },
  { label: 'Students', to: '/hod/students', icon: Users, group: 'Records' },
  { label: 'Reports', to: '/hod/reports', icon: ChartColumn, group: 'Records' },
  { label: 'Certificates', to: '/hod/certificates', icon: Award, group: 'Records' },
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
