import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  isLoading?: boolean
}

/** Page controls for a paginated list. */
export default function Pagination({
  page,
  perPage,
  total,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const first = total === 0 ? 0 : (page - 1) * perPage + 1
  const last = Math.min(page * perPage, total)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        {total === 0
          ? 'No records'
          : `Showing ${first}–${last} of ${total}`}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isLoading || page <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <span className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLoading || page >= totalPages}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
