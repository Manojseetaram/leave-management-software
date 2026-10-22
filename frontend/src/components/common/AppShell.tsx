import type { ReactNode } from 'react'

interface AppShellProps {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
}

/**
 * The frame every signed-in screen sits in.
 *
 * The navigation rail is beside the content on the desktop and over it below
 * that, so the three role consoles share one frame and stay in step.
 */
export default function AppShell({ sidebar, topbar, children }: AppShellProps) {
  return (
    <div className="app-shell bg-background">
      {sidebar}

      <div className="app-shell-content flex min-h-screen flex-col">
        {topbar}

        <main className="min-w-0 flex-1">
          <div className="app-container">{children}</div>
        </main>
      </div>
    </div>
  )
}
