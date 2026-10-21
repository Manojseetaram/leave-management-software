import { LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'

interface AppTopbarProps {
  title: string
  onMenuClick: () => void
}

/** The application bar shared by the three role layouts. */
export default function AppTopbar({ title, onMenuClick }: AppTopbarProps) {
  const { user, roles, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex h-17 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <h1 className="text-sm font-semibold text-foreground md:text-base">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user.full_name}</p>
            <p className="text-xs text-muted-foreground">{roles.join(', ')}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
