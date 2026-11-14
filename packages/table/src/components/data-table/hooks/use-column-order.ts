import { useTableStorage } from "../../../hooks/use-table-storage"
import type { ColumnOrderState } from "../../../lib/table-state"
import * as React from "react"

import type { DataTableColumn } from "../data-table.types"

/**
 * Reorders `columns` to match a persisted list of ids.
 *
 * An id the list does not mention — a column added in a later release — ranks after everything it
 * does, and keeps its position relative to the other newcomers because `sort` is stable. An id in
 * the list that no longer exists is simply never looked up. Between them, a saved order stays
 * usable across a change to the columns rather than having to be thrown away.
 */
function applyOrder<TRow>(
  columns: DataTableColumn<TRow>[],
  order: string[]
): DataTableColumn<TRow>[] {
  if (order.length === 0) {
    return columns
  }

  const rankById = new Map(order.map((columnId, index) => [columnId, index]))
  const newcomerRank = order.length
  const rankOf = (columnId: string) => rankById.get(columnId) ?? newcomerRank

  return [...columns].sort((a, b) => rankOf(a.id) - rankOf(b.id))
}

export interface UseColumnOrderOptions<TRow> {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
  columns: DataTableColumn<TRow>[]
  onColumnOrderChange?: (state: ColumnOrderState) => void
}

/** The order the user dragged the columns into. */
export function useColumnOrder<TRow>(options: UseColumnOrderOptions<TRow>) {
  const {
    tableId,
    storageKey,
    userId,
    persistState = false,
    columns,
    onColumnOrderChange,
  } = options

  const { read, write } = useTableStorage<Partial<ColumnOrderState>>(
    storageKey,
    tableId,
    "columnOrder",
    userId,
    persistState
  )

  // The plain setter name is the public one this hook returns, which also persists.
  // eslint-disable-next-line @eslint-react/use-state
  const [order, setOrderState] = React.useState<string[]>(() => {
    const stored = read().order
    return Array.isArray(stored) ? stored : []
  })

  const setOrder = React.useCallback(
    (next: string[]) => {
      const state: ColumnOrderState = { order: next }

      setOrderState(next)
      write(state)
      onColumnOrderChange?.(state)
    },
    [write, onColumnOrderChange]
  )

  const orderedColumns = React.useMemo(
    () => applyOrder(columns, order),
    [columns, order]
  )

  return { order, orderedColumns, setOrder }
}
