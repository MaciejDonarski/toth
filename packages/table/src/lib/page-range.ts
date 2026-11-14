/** One slot in the rendered pager: a page to link to, or a gap standing for several. */
export type PageRangeItem = number | "ellipsis"

/**
 * The page numbers a pager should draw for `currentPage` out of `totalPages`.
 *
 * Always includes the first and last page — they are the two a user reaches for without counting —
 * plus `siblingCount` on either side of the current one. Everything else collapses into an
 * `'ellipsis'`, with two exceptions, both of them the same idea: an ellipsis is only worth drawing
 * when it saves room.
 *
 *   - A pager short enough to fit in the slots the elided form would take is listed in full. Five
 *     pages shown as `1 2 … 5` is no narrower than `1 2 3 4 5`, and it hides two pages behind a
 *     click for nothing.
 *   - A gap of exactly one page is filled in, because the number is narrower than the ellipsis
 *     standing in for it.
 *
 * This is the part `react-paginate` used to own. It is pure so it can be tested on its own, and so
 * the markup stays whatever `Pagination` from `@toth/ui` renders.
 */
export function pageRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): PageRangeItem[] {
  if (totalPages <= 0) {
    return []
  }

  // first + ellipsis + (siblings either side of current) + ellipsis + last
  const elidedSlots = siblingCount * 2 + 5

  if (totalPages <= elidedSlots) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const shown = new Set<number>([1, totalPages])

  for (
    let page = currentPage - siblingCount;
    page <= currentPage + siblingCount;
    page += 1
  ) {
    if (page >= 1 && page <= totalPages) {
      shown.add(page)
    }
  }

  const sorted = [...shown].sort((a, b) => a - b)
  const items: PageRangeItem[] = []
  let previous = 0

  for (const page of sorted) {
    const gap = page - previous

    if (previous !== 0 && gap > 1) {
      items.push(gap === 2 ? previous + 1 : "ellipsis")
    }

    items.push(page)
    previous = page
  }

  return items
}

/**
 * How many pages `totalItems` fills at `pageSize`.
 *
 * Never less than 1: a table showing "Page 1 of 0" reads as broken, and an empty result set is
 * still one (empty) page as far as the pager is concerned.
 */
export function pageCount(totalItems: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1
  }

  return Math.max(1, Math.ceil(totalItems / pageSize))
}
