import * as React from "react"

import type { PlainTableColumn, PlainTableStickyProps } from "../types"

interface ColumnWidth {
  id: string
  width: number
}

/**
 * Turns `stickyLeft` / `stickyRight` into the attributes and the offset each cell needs to pin
 * itself, indexed by column position.
 *
 * A pure computation over the `<colgroup>` widths, not a measurement. The old hook walked every
 * `<tr>` after layout and wrote `style.left`, `style.zIndex` and `sticky-col-*` classes straight
 * onto the cells — behind React's back, so the next render could drop them, on a `resize`
 * listener that re-read the whole table, and through global class names that sat outside the
 * `snt-` namespace. None of that is needed: the table lays out `table-layout: fixed` from those
 * exact widths, so the offsets are known before a single cell is rendered.
 *
 * The offsets are only ever *visible* while the body scrolls sideways, which is precisely when
 * the table is wider than its wrapper and the `<col>` widths are what the browser used.
 *
 * The breakpoint below which pinning is dropped is not here either — the stylesheet applies
 * `position: sticky` inside a media query, so it stays in one place.
 */
export function useStickyColumns<TRow>(
  columns: PlainTableColumn<TRow>[],
  colgroup: ColumnWidth[]
): (columnIndex: number) => PlainTableStickyProps {
  const stickyProps = React.useMemo(() => {
    const props: PlainTableStickyProps[] = columns.map(() => ({}))

    // The last column pinned left and the first pinned right are the two facing the
    // scrolling content — they draw the seam, so only they get `data-sticky-end`.
    const lastLeft = columns.reduce(
      (last, column, index) => (column.stickyLeft ? index : last),
      -1
    )
    const firstRight = columns.findIndex((column) => column.stickyRight)

    let leftOffset = 0

    for (let index = 0; index < columns.length; index += 1) {
      if (!columns[index]?.stickyLeft) continue

      props[index] = {
        "data-sticky": "left",
        ...(index === lastLeft ? { "data-sticky-end": "" as const } : {}),
        style: {
          "--plain-table-sticky-offset": `${leftOffset}px`,
        } as React.CSSProperties,
      }

      leftOffset += colgroup[index]?.width ?? 0
    }

    let rightOffset = 0

    for (let index = columns.length - 1; index >= 0; index -= 1) {
      if (!columns[index]?.stickyRight) continue

      props[index] = {
        "data-sticky": "right",
        ...(index === firstRight ? { "data-sticky-end": "" as const } : {}),
        style: {
          "--plain-table-sticky-offset": `${rightOffset}px`,
        } as React.CSSProperties,
      }

      rightOffset += colgroup[index]?.width ?? 0
    }

    return props
  }, [columns, colgroup])

  return React.useCallback(
    (columnIndex: number) => stickyProps[columnIndex] ?? {},
    [stickyProps]
  )
}
