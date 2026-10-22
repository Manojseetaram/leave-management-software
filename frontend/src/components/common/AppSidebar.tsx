import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, X, type LucideIcon } from 'lucide-react'

import Avatar from './Avatar'
import Brand from './Brand'

import useBodyScrollLock from '../../hooks/useBodyScrollLock'
import useFocusTrap from '../../hooks/useFocusTrap'

import { useAuth } from '../../context/useAuth'

import { roleLabels } from '../../utils/auth'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** The heading the item is listed under. */
  group?: string
}

interface AppSidebarProps {
  title: string
  items: NavItem[]
  isOpen: boolean
  onClose: () => void
}

/**
 * The navigation rail shared by the three role layouts.
 *
 * On the desktop it is a fixed column beside the content. Below that it is a
 * drawer that closes on Escape, keeps the keyboard inside it and hands the
 * page behind it back when it is closed.
 */
export default function AppSidebar({
  title,
  items,
  isOpen,
  onClose,
}: AppSidebarProps) {
  const { user, roles, logout } = useAuth()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLElement>(null)

  const [isDesktop, setIsDesktop] = useState(false)

  /*
     On the desktop the rail is always on the screen, so it must never be
     made inert. Below that it is a drawer that is hidden until it is opened.
  */
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(query.matches)

    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const isHidden = !isDesktop && !isOpen

  useFocusTrap(isOpen, panelRef)
  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const groups = items.reduce<{ name: string; items: NavItem[] }[]>((acc, item) => {
    const name = item.group ?? ''
    const existing = acc.find((group) => group.name === name)

    if (existing) {
      existing.items.push(item)
    } else {
      acc.push({ name, items: [item] })
    }

    return acc
  }, [])

  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        ref={panelRef}
        inert={isHidden}
        aria-label={`${title} navigation`}
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="app-topbar flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <Brand subtitle={title} />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav
          className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
          aria-label="Main navigation"
        >
          {groups.map((group) => (
            <div key={group.name || 'main'}>
              {group.name && (
                <p className="app-label mb-2 px-3">{group.name}</p>
              )}

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon

                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-sidebar-active text-sidebar-active-foreground'
                              : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              aria-hidden="true"
                              className={`absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600 transition-opacity ${
                                isActive ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {item.label}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
              <Avatar name={user.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.full_name}
                </p>
                <p className="truncate text-xs text-sidebar-muted">
                  {roleLabels(roles)}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
