import type { TableMessages } from "../../lib/messages"
import type {
  PlainTableColumn,
  PlainTableColumnMenuGroup,
} from "../plain-table/types"
import type {
  ColumnPinSide,
  SortDirection,
  SortState,
} from "../../lib/table-state"

import { ACTIONS_COLUMN_ID, SELECTION_COLUMN_ID } from "./data-table.constants"
import type { DataTableColumn } from "./data-table.types"

// What a composed table adds to a column's header menu around `PlainTable`'s own Align section:
//
//     Sort ascending · Sort descending
//     ── Align (PlainTable's) ──
//     Pin to left edge / Unpin · Hide column
//
// Each section only appears where the table offers the feature at all, so a table without pinning
// shows no Pin row and a column that cannot be sorted shows no Sort rows — and a column with
// nothing left in its menu gets no chevron.

export interface ColumnMenuOptions {
  getSortDirection: (columnId: string) => SortDirection
  setSort: (sort: Partial<SortState>) => void
  /** Offer Pin / Unpin. */
  withPinning: boolean
  getPinSide: (columnId: string) => ColumnPinSide
  setPin: (columnId: string, side: ColumnPinSide) => void
  /** Offer Hide column. */
  withHiding: boolean
  toggleColumn: (columnId: string) => void
  messages: TableMessages
}

/** The two columns the table adds itself — a checkbox and a row menu have nothing to configure. */
function isSynthetic(columnId: string) {
  return columnId === SELECTION_COLUMN_ID || columnId === ACTIONS_COLUMN_ID
}

function columnMenuItems<TRow>(options: ColumnMenuOptions) {
  return (
    plainColumn: PlainTableColumn<TRow>,
    defaults: PlainTableColumnMenuGroup[]
  ): PlainTableColumnMenuGroup[] => {
    const column = plainColumn as DataTableColumn<TRow>

    if (isSynthetic(column.id)) return []

    const groups: PlainTableColumnMenuGroup[] = []

    if (column.isSortable) {
      const direction = options.getSortDirection(column.id)
      // Choosing the direction a column is already sorted in takes the sort off again, the
      // way the header label's own cycle ends — otherwise the menu could sort but never unsort.
      const choose = (next: "asc" | "desc") =>
        options.setSort(
          direction === next
            ? { columnId: "", direction: "" }
            : { columnId: column.id, direction: next }
        )

      groups.push({
        key: "sort",
        items: [
          {
            key: "asc",
            label: options.messages.column.sortAscending,
            icon: "move-up",
            checked: direction === "asc",
            onSelect: () => choose("asc"),
          },
          {
            key: "desc",
            label: options.messages.column.sortDescending,
            icon: "move-down",
            checked: direction === "desc",
            onSelect: () => choose("desc"),
          },
        ],
      })
    }

    groups.push(...defaults)

    const layout: PlainTableColumnMenuGroup = { key: "layout", items: [] }

    if (options.withPinning) {
      const side = options.getPinSide(column.id)

      layout.items.push(
        side
          ? {
              key: "unpin",
              label: options.messages.column.unpin,
              icon: "pin-off",
              onSelect: () => options.setPin(column.id, false),
            }
          : {
              key: "pin",
              label: options.messages.column.pinLeft,
              icon: "panel-left-dashed",
              onSelect: () => options.setPin(column.id, "left"),
            }
      )
    }

    if (options.withHiding) {
      layout.items.push({
        key: "hide",
        label: options.messages.column.hide,
        icon: "eye-off",
        onSelect: () => options.toggleColumn(column.id),
      })
    }

    if (layout.items.length > 0) groups.push(layout)

    return groups
  }
}

export { columnMenuItems }
