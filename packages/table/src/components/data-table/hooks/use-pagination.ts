import { useTableStorage } from "../../../hooks/use-table-storage"
import { pageCount } from "../../../lib/page-range"
import type { PaginationState } from "../../../lib/table-state"
import * as React from "react"

import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZES } from "../data-table.constants"
import type { DataTablePaginationOptions } from "../data-table.types"

type StoredPagination = { pageSize?: number }

export interface UsePaginationOptions<TRow> {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
  rows: TRow[]
  /** Server mode: `rows` is already one page, and the total comes from `totalItems`. */
  manual?: boolean
  totalItems?: number
  paginationOptions?: DataTablePaginationOptions
  /**
   * Controlled: the page on screen, one-based. Paging then only reports through `onPageChange`,
   * and so does the jump back to page 1 that a filter or page-size change implies — which the
   * uncontrolled table performs silently, but a caller who owns the page has no other way to hear
   * about. An out-of-range value is shown as the last page and left for the caller to correct.
   */
  page?: number
  /** Controlled: rows per page. Reported through `onPageSizeChange`, and never persisted. */
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

/**
 * Which page is showing, how big it is, and — unless the server paginated — the rows on it.
 *
 * Only the page SIZE is persisted, never the page. A size is a preference ("I work in hundreds");
 * a page number is a position in a result set that will have changed by the next visit, and
 * restoring it lands the user on a page of rows that has nothing to do with the one they left.
 */
export function usePagination<TRow>(options: UsePaginationOptions<TRow>) {
  const {
    tableId,
    storageKey,
    userId,
    persistState = false,
    rows,
    manual = false,
    totalItems: totalItemsProp,
    paginationOptions,
    page: controlledPage,
    pageSize: controlledPageSize,
    onPageChange,
    onPageSizeChange,
  } = options

  const isPageControlled = controlledPage !== undefined
  const isSizeControlled = controlledPageSize !== undefined

  const { read, write } = useTableStorage<StoredPagination>(
    storageKey,
    tableId,
    "pagination",
    userId,
    persistState
  )

  const sizes = paginationOptions?.sizes ?? DEFAULT_PAGE_SIZES

  const [uncontrolledPageSize, setUncontrolledPageSize] = React.useState(
    () =>
      (isSizeControlled ? undefined : read().pageSize) ??
      paginationOptions?.pageSize ??
      DEFAULT_PAGE_SIZE
  )
  const [uncontrolledPage, setUncontrolledPage] = React.useState(1)

  const pageSize = controlledPageSize ?? uncontrolledPageSize

  const totalItems = manual ? (totalItemsProp ?? 0) : rows.length
  const totalPages = pageCount(totalItems, pageSize)

  // Bring an out-of-range page back in, which happens when a filter narrows the result set under
  // the user's feet.
  //
  // Adjusted during render rather than from an effect. This is derived state — the page number
  // only makes sense against the current total — and React re-runs the render with the corrected
  // value before committing anything to the DOM, so the browser never paints the empty page. An
  // effect would paint it first and then correct it, and would cost a second commit to do so.
  // The condition cannot loop: after the assignment the page equals the total.
  //
  // Skipped while a server total is still unknown: on the first render of a manual table
  // `totalItems` is 0 because nothing has been fetched yet, not because there is nothing to
  // fetch, and clamping there would reset the page before the request that fills it even lands.
  const totalUnknown = manual && totalItems === 0

  if (!isPageControlled && !totalUnknown && uncontrolledPage > totalPages) {
    setUncontrolledPage(totalPages)
  }

  // A controlled page cannot be corrected from here — that would be writing the caller's state —
  // so an out-of-range one is only DISPLAYED clamped.
  const currentPage = isPageControlled
    ? totalUnknown
      ? Math.max(1, controlledPage)
      : Math.max(1, Math.min(controlledPage, totalPages))
    : uncontrolledPage

  const goToPage = React.useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages))

      if (!isPageControlled) setUncontrolledPage(clamped)
      onPageChange?.(clamped)
    },
    [isPageControlled, totalPages, onPageChange]
  )

  const setPageSize = React.useCallback(
    (size: number) => {
      if (!isSizeControlled) {
        setUncontrolledPageSize(size)
        write({ pageSize: size })
      }

      // Back to the first page: page 7 of 40 rows-per-page is a different set of rows from
      // page 7 of 100, so keeping the number would move the user somewhere they did not ask
      // to go.
      if (!isPageControlled) setUncontrolledPage(1)
      else if (currentPage !== 1) onPageChange?.(1)

      onPageSizeChange?.(size)
    },
    [
      isSizeControlled,
      isPageControlled,
      currentPage,
      write,
      onPageChange,
      onPageSizeChange,
    ]
  )

  /**
   * Jumps to the first page without reporting it.
   *
   * This is what a filter change calls: the page reset is a consequence of the filter, not a
   * navigation the user performed, and reporting it would have a consumer fire a second request
   * for a page it is already about to ask for.
   *
   * The one exception is a controlled page, which the table cannot move itself: there the reset
   * is reported, and only when the caller is not already on page 1.
   */
  const resetPage = React.useCallback(() => {
    if (!isPageControlled) setUncontrolledPage(1)
    else if (currentPage !== 1) onPageChange?.(1)
  }, [isPageControlled, currentPage, onPageChange])

  const paginatedRows = React.useMemo(() => {
    if (manual) return rows

    const start = (currentPage - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, currentPage, pageSize, manual])

  const pagination = React.useMemo<PaginationState>(
    () => ({ currentPage, pageSize, totalItems, totalPages }),
    [currentPage, pageSize, totalItems, totalPages]
  )

  return { pagination, paginatedRows, sizes, goToPage, setPageSize, resetPage }
}
