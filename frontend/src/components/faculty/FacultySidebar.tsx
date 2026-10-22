import { ClipboardList, LayoutDashboard } from 'lucide-react'

import AppSidebar, { type NavItem } from '../common/AppSidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/faculty/dashboard', icon: LayoutDashboard, group: 'Overview' },
  { label: 'Student requests', to: '/faculty/students', icon: ClipboardList, group: 'Records' },
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
