import { LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import Avatar from './Avatar'

import { useAuth } from '../../context/useAuth'

import { roleLabels } from '../../utils/auth'

interface AppTopbarProps {
  /** The console the screen belongs to, for example "Student Portal". */
  title: string
  onMenuClick: () => void
}

/**
 * The application bar shared by the three role layouts.
 *
 * It holds the way back to the navigation, the name of the console and the
 * account of the reader.
 */
export default function AppTopbar({ title, onMenuClick }: AppTopbarProps) {
  const { user, roles, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const roleLabel = roleLabels(roles)

  return (
    <header className="app-topbar sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card/85 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="-ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <p className="app-label hidden md:block">Leave Management</p>
          <p className="truncate text-sm font-semibold text-foreground md:text-base">
            {title}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {roleLabel && (
          <span className="hidden items-center rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground sm:inline-flex">
            {roleLabel}
          </span>
        )}

        {user && (
          <div className="hidden items-center gap-2.5 lg:flex">
            <Avatar name={user.full_name} size="sm" />
            <span className="max-w-40 truncate text-sm font-medium text-foreground">
              {user.full_name}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleLogout()}
          aria-label="Sign out"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:px-3"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden md:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
