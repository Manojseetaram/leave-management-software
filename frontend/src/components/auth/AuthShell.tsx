import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import Brand from '../common/Brand'

export interface AuthFeature {
  icon: LucideIcon
  text: string
}

interface AuthShellProps {
  /** The heading of the form. */
  title: string
  /** The line under the heading. */
  subtitle: string
  /** The big statement on the brand panel. */
  headline: string
  /** The explanation under the statement. */
  description: string
  /** The three things the system does, shown on the brand panel. */
  features: AuthFeature[]
  /** The line at the bottom of the brand panel. */
  footer: string
  children: ReactNode
}

/**
 * The frame of the two screens a signed-out reader can reach.
 *
 * On a wide screen the brand panel stands beside the form. Below that the
 * panel is replaced by a compact mark above the form, so the same screen
 * reads the same way on a phone.
 */
export default function AuthShell({
  title,
  subtitle,
  headline,
  description,
  features,
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-black/10 blur-3xl"
        />

        <div className="relative">
          <Brand variant="onGradient" subtitle="ISE Department" />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold text-white xl:text-4xl">
            {headline}
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-brand-100 xl:text-base">
            {description}
          </p>

          <ul className="mt-8 space-y-4">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <li key={feature.text} className="flex items-start gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="pt-1.5 text-sm text-brand-50">{feature.text}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">{footer}</p>
      </aside>

      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
        <div className="w-full max-w-md">
          <Brand className="mb-10 lg:hidden" subtitle="ISE Department" />

          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
