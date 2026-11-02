import { Award, ChartColumn, ClipboardList, LayoutDashboard, Users } from 'lucide-react'

import AppSidebar, { type NavItem } from '../common/AppSidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Leave requests', to: '/hod/requests', icon: ClipboardList },
  { label: 'Students', to: '/hod/students', icon: Users },
  { label: 'Reports', to: '/hod/reports', icon: ChartColumn },
  { label: 'Certificates', to: '/hod/certificates', icon: Award },
  { label: 'Notifications', to: '/admin/notifications', icon: ClipboardList },
  { label: 'Audit', to: '/admin/audit', icon: ChartColumn },
]

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  return <AppSidebar title="Admin Console" items={NAV_ITEMS} isOpen={isOpen} onClose={onClose} />
}
