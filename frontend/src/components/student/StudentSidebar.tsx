import { CalendarPlus, Clock, LayoutDashboard, User } from 'lucide-react'

import AppSidebar, { type NavItem } from '../common/AppSidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard, group: 'Overview' },
  { label: 'Apply for leave', to: '/student/apply', icon: CalendarPlus, group: 'Leave' },
  { label: 'My requests', to: '/student/history', icon: Clock, group: 'Leave' },
  { label: 'Profile', to: '/student/profile', icon: User, group: 'Account' },
]

interface StudentSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function StudentSidebar({ isOpen, onClose }: StudentSidebarProps) {
  return (
    <AppSidebar
      title="Student Portal"
      items={NAV_ITEMS}
      isOpen={isOpen}
      onClose={onClose}
    />
  )
}
