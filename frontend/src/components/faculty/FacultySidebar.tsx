import { ClipboardList, LayoutDashboard, Users } from 'lucide-react'

import AppSidebar, { type NavItem } from '../common/AppSidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/faculty/dashboard', icon: LayoutDashboard },
  { label: 'Students', to: '/faculty/students', icon: Users },
  { label: 'Student requests', to: '/faculty/requests', icon: ClipboardList },
]

interface FacultySidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function FacultySidebar({ isOpen, onClose }: FacultySidebarProps) {
  return (
    <AppSidebar
      title="Faculty Portal"
      items={NAV_ITEMS}
      isOpen={isOpen}
      onClose={onClose}
    />
  )
}
