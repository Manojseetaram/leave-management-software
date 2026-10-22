interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
  /** The number of records behind the filter, shown next to the label. */
  count?: number
}

/** A toggle in a filter row. The pressed state is exposed to screen readers. */
export default function FilterChip({
  label,
  active,
  onClick,
  count,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {label}

      {count !== undefined && (
        <span
          className={`app-numeric rounded-full px-1.5 text-[10px] font-semibold ${
            active
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}
