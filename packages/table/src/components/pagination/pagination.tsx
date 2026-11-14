import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  Pagination as PaginationUI,
} from "@toth/ui/components/pagination"
import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Button } from "../../internal/button"
import { pageRange } from "../../lib/page-range"
import type { PaginationState } from "../../lib/table-state"

// The table's pager.
//
// It borrows the row, the list and the ellipsis from `Pagination` in `@toth/ui`, and draws
// the page controls as buttons rather than `PaginationLink`. That is deliberate: a `PaginationLink`
// is an `<a href>`, because a paginated ARTICLE is navigable and shareable. A table's page is not —
// it is component state, with no URL behind it — and an anchor without a real target is a link
// that lies to the browser, to a screen reader and to "open in new tab".
//
// Previous and Next say so in words, since they are the two controls everybody uses. The numbers
// are small buttons of their own, not `Button`s: the current page is a tint, not a variant any
// button has.
//
// Which pages to draw comes from `pageRange`, which is pure and tested on its own.

export interface DataTablePaginationProps {
  pagination: PaginationState
  onPageChange: (page: number) => void
  /** How many pages to keep either side of the current one before eliding. */
  siblingCount?: number
  /** Only the current page between the arrows — for a narrow table. */
  compact?: boolean
  className?: string
}

function DataTablePagination({
  pagination,
  onPageChange,
  siblingCount = 1,
  compact = false,
  className,
}: DataTablePaginationProps) {
  const { currentPage, totalPages } = pagination
  const messages = useTableMessages()

  // One page is not something to page through, and a row of controls that cannot do anything is
  // worse than the space it takes.
  if (totalPages <= 1) {
    return null
  }

  const items = compact
    ? [currentPage]
    : pageRange(currentPage, totalPages, siblingCount)

  return (
    <PaginationUI
      aria-label={messages.pagination.label}
      className={cn("mx-0 w-auto", className)}
    >
      <PaginationContent className="gap-0.5">
        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            icon="chevron-left"
            aria-label={messages.pagination.previous}
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            {messages.pagination.previousLabel}
          </Button>
        </PaginationItem>

        {items.map((item, index) => (
          // The ellipsis has no page of its own to be keyed by, and two of them can
          // appear at once, so position is the only stable identity available.
          <PaginationItem
            // A gap has no page of its own; at most one sits on each side of the current page.
            key={
              item === "ellipsis"
                ? index < items.indexOf(currentPage)
                  ? "gap-start"
                  : "gap-end"
                : item
            }
            data-pagination-item={item === "ellipsis" ? "ellipsis" : "page"}
            data-current={item === currentPage || undefined}
          >
            {item === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <button
                type="button"
                className="relative h-8 min-w-8 cursor-pointer rounded-md px-1.5 text-sm tabular-nums transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary pointer-coarse:after:absolute pointer-coarse:after:-inset-x-0.5 pointer-coarse:after:-inset-y-2"
                // The current page is state, not a variant — the same spelling
                // `PaginationLink` uses, so a consumer's selector works on both.
                aria-current={item === currentPage ? "page" : undefined}
                data-active={item === currentPage || undefined}
                aria-label={messages.pagination.goToPage(item)}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            rightIcon="chevron-right"
            aria-label={messages.pagination.next}
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            {messages.pagination.nextLabel}
          </Button>
        </PaginationItem>
      </PaginationContent>
    </PaginationUI>
  )
}

export { DataTablePagination }
