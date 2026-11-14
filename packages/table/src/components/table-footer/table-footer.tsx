import type * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@toth/ui/components/select"
import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import type { PaginationState } from "../../lib/table-state"
import { DataTablePagination } from "../pagination"

// What sits under the table: how much of the result set is on screen on one side, the pager on the
// other, and the page-size control beside the pager it changes.
//
// The count is a sentence rather than a set of numbers because it answers the question a user
// actually has — "am I looking at all of it?" — with the two numbers that answer it in bold:
// "**1–25** of **67** orders". A selection, and anything else a caller appends through `extra`,
// follows it after a middle dot rather than on a line of its own.

/** The range of rows on screen, one-based and inclusive, as the sentence reports it. */
function visibleRange(pagination: PaginationState): {
  first: number
  last: number
} {
  const { currentPage, pageSize, totalItems } = pagination
  const first = (currentPage - 1) * pageSize + 1

  return { first, last: Math.min(currentPage * pageSize, totalItems) }
}

export interface DataTableFooterProps {
  pagination: PaginationState
  /** The page sizes to offer. An empty list hides the control. */
  sizes?: number[]
  selectedCount?: number
  /**
   * What the rows are called in the count — "1–25 of 67 orders". Lower-case. Defaults to
   * `messages.pagination.items(total)`.
   */
  itemsLabel?: string
  /** Appended to the count after a middle dot — the async table puts "updated 14:32:05" here. */
  extra?: React.ReactNode
  /** How wide the table is. At `sm` the pager shows only the current page between its arrows. */
  size?: "sm" | "md" | "lg"
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  className?: string
}

function DataTableFooter({
  pagination,
  sizes = [],
  selectedCount = 0,
  itemsLabel,
  extra,
  size,
  onPageChange,
  onPageSizeChange,
  className,
}: DataTableFooterProps) {
  const { totalItems, pageSize } = pagination
  const { first, last } = visibleRange(pagination)
  const messages = useTableMessages()

  return (
    <div
      data-slot="table-footer"
      data-size={size}
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-muted/40 px-4 py-2",
        className
      )}
    >
      <div
        data-slot="table-footer-summary"
        className="text-sm text-muted-foreground tabular-nums [&_b]:font-semibold [&_b]:text-foreground"
      >
        {totalItems > 0 ? (
          <span className="whitespace-nowrap">
            {messages.pagination.summary(
              <b>
                {first}–{last}
              </b>,
              <b>{totalItems}</b>,
              itemsLabel ?? messages.pagination.items(totalItems)
            )}
          </span>
        ) : null}

        {selectedCount > 0 ? (
          <span className="whitespace-nowrap">
            {" · "}
            {messages.pagination.selected(<b>{selectedCount}</b>)}
          </span>
        ) : null}

        {extra ? (
          <span className="whitespace-nowrap">
            {" · "}
            {extra}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {sizes.length > 0 ? (
          // Base UI's Select is typed by its value; page sizes go through it as strings
          // so the control stays the plain string Select every other list in the library
          // uses, and the number is restored on the way out.
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground" aria-hidden="true">
              {messages.pagination.rows}
            </span>
            <Select
              value={String(pageSize)}
              // Base UI reports `null` when a select is cleared. This one cannot be —
              // there is no clear control and no empty option — but the signature allows
              // it, and `Number(null)` is 0, which would ask for a page of no rows.
              onValueChange={(value: string | null) => {
                if (value !== null) onPageSizeChange(Number(value))
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label={messages.pagination.rowsPerPage}
                className="w-18"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-16">
                {sizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex w-fit flex-none">
          <DataTablePagination
            pagination={pagination}
            onPageChange={onPageChange}
            compact={size === "sm"}
          />
        </div>
      </div>
    </div>
  )
}

export { DataTableFooter }
