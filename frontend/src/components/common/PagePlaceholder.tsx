interface PagePlaceholderProps {
  title: string
  description?: string
}

/**
 * Temporary shell for a screen that has not been built yet. It keeps the
 * layout, the heading and the spacing consistent while the real screen is
 * still pending.
 */
export default function PagePlaceholder({
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <div className="app-page">
      <header className="page-header">
        <h1 className="text-page-title">{title}</h1>
      </header>

      <div className="app-card empty-state">
        <p className="text-sm text-muted-foreground">
          {description ?? 'This screen has not been built yet.'}
        </p>
      </div>
    </div>
  )
}
