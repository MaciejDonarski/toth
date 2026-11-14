import * as React from "react"

import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Icon } from "../../internal/icon"
import type { TableMessages } from "../../lib/messages"
import type { DataTableColumn } from "../data-table/data-table.types"
import { PlainTableHeaderCellLabel } from "../plain-table"
import type {
  PlainTableColumn,
  PlainTableHeaderCellLabelProps,
} from "../plain-table/types"
import type { SortDirection } from "../../lib/table-state"

// The sort control, as a `headerCellLabel` slot for `PlainTable`.
//
// The state reaches it through context rather than through props, because `PlainTable` decides
// what a slot is handed — `{ column, className }` — and a slot component that had to be rebuilt on
// every sort change would remount every header label with it.
//
// The `<th>` gets `aria-sort` separately, through `getHeaderCellProps` on the header slot: that
// attribute belongs on the columnheader, and no amount of markup inside the cell substitutes for
// it. `sortHeaderCellProps` below is what a table passes there.

interface SortContextValue {
  getSortDirection: (columnId: string) => SortDirection
  onSort: (columnId: string) => void
}

const SortContext = React.createContext<SortContextValue | null>(null)

/** Makes the sort state available to the header label slot beneath it. */
function DataTableSortProvider({
  value,
  children,
}: {
  value: SortContextValue
  children: React.ReactNode
}) {
  return <SortContext value={value}>{children}</SortContext>
}

/** How a direction is drawn. No sort yet gets the two-way arrow, faded until the cell is hovered. */
const SORT_ICON = {
  asc: "move-up",
  desc: "move-down",
  "": "arrow-up-down",
} as const

/** What a direction is called, for the button's accessible name. */
const SORT_STATE = {
  asc: "ascending",
  desc: "descending",
  "": "none",
} as const satisfies Record<SortDirection, keyof TableMessages["sort"]>

/** The value `aria-sort` takes on a `<th>` for a given direction. */
const ARIA_SORT = {
  asc: "ascending",
  desc: "descending",
  "": "none",
} as const

/**
 * `aria-sort` for each column, to pass as `slotProps.header.getHeaderCellProps`.
 *
 * Only sortable columns get the attribute at all: `aria-sort="none"` on a column that can never be
 * sorted tells a screen-reader user the table offers something it does not.
 */
function sortHeaderCellProps<TRow>(
  getSortDirection: (columnId: string) => SortDirection
): (column: PlainTableColumn<TRow>) => React.ComponentProps<"th"> {
  return (column) => {
    // The slot signatures are `PlainTable`'s, so they describe a `PlainTableColumn`. What is
    // actually in the array is a `DataTableColumn`, which is that plus `isSortable` — the cast
    // is safe because `DataTableColumn` extends it, and narrowing here is what lets the slot
    // keep the shape `PlainTable` expects.
    const { isSortable } = column as DataTableColumn<TRow>

    return isSortable
      ? { "aria-sort": ARIA_SORT[getSortDirection(column.id)] }
      : {}
  }
}

/**
 * A header label that sorts its column when clicked.
 *
 * A column that is not sortable — or a table with no sorting at all — renders exactly what
 * `PlainTable` would have rendered, so the two kinds of header cell line up to the pixel.
 */
function DataTableSortLabel<TRow>(props: PlainTableHeaderCellLabelProps<TRow>) {
  const { className } = props
  const sorting = React.use(SortContext)
  const messages = useTableMessages()
  // See the note in `sortHeaderCellProps` for why the column is narrowed here.
  const column = props.column as DataTableColumn<TRow>

  if (!column.isSortable || !sorting) {
    return <PlainTableHeaderCellLabel {...props} />
  }

  const direction = sorting.getSortDirection(column.id)
  const label =
    typeof column.label === "function" ? column.label() : column.label

  return (
    <button
      type="button"
      data-slot="sort-button"
      data-direction={direction || undefined}
      // A bare `<button>`, not `Button`: it has to look like the header cell's label, not like a
      // control in it. The negative margin gives the hover surface room without moving the text
      // off the column's edge, so a sortable label lines up with one that is not.
      className={cn(
        "group/sort -mx-1 inline-flex max-w-[calc(100%+0.5rem)] min-w-0 cursor-pointer items-center gap-1 rounded-sm p-1 text-inherit outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-direction:text-primary",
        className
      )}
      // The name says what clicking does AND where the column stands, because `aria-sort` is
      // announced on the header rather than on the control inside it.
      aria-label={
        typeof label === "string"
          ? messages.sort.label(label, messages.sort[SORT_STATE[direction]])
          : undefined
      }
      onClick={() => sorting.onSort(column.id)}
    >
      <PlainTableHeaderCellLabel column={column} />
      <Icon
        icon={SORT_ICON[direction]}
        // The unsorted arrow is a hint, not information: hidden until the label is hovered or
        // focused. A sorted column keeps its arrow, in the label's colour.
        className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100 group-data-direction/sort:text-current group-data-direction/sort:opacity-100"
      />
    </button>
  )
}

export { DataTableSortLabel, DataTableSortProvider, sortHeaderCellProps }
export type { SortContextValue }
