import { useTableStorage } from "../../../hooks/use-table-storage"
import type { ColumnVisibilityState } from "../../../lib/table-state"
import * as React from "react"

import type { DataTableColumn } from "../data-table.types"

function getInitialHidden<TRow>(
  columns: DataTableColumn<TRow>[],
  stored: Partial<ColumnVisibilityState>
): Set<string> {
  // A stored list wins even when it is EMPTY, and the emptiness is the point: it means the user
  // has unhidden everything, and re-seeding from `isHidden` would hide those columns again on
  // every reload. The columns' own flags are only the starting point for someone who has never
  // touched the column list.
  if (Array.isArray(stored.hiddenIds)) {
    return new Set(stored.hiddenIds)
  }

  return new Set(
    columns.filter((column) => column.isHidden).map((column) => column.id)
  )
}

export interface UseColumnsVisibilityOptions<TRow> {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
  columns: DataTableColumn<TRow>[]
  onColumnVisibilityChange?: (state: ColumnVisibilityState) => void
}

/** Which columns are hidden, and the column list with the hidden ones taken out. */
export function useColumnsVisibility<TRow>(
  options: UseColumnsVisibilityOptions<TRow>
) {
  const {
    tableId,
    storageKey,
    userId,
    persistState = false,
    columns,
    onColumnVisibilityChange,
  } = options

  const { read, write } = useTableStorage<Partial<ColumnVisibilityState>>(
    storageKey,
    tableId,
    "columnVisibility",
    userId,
    persistState
  )

  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(() =>
    getInitialHidden(columns, read())
  )

  const apply = React.useCallback(
    (next: Set<string>) => {
      const state: ColumnVisibilityState = { hiddenIds: [...next] }

      setHiddenIds(next)
      write(state)
      onColumnVisibilityChange?.(state)
    },
    [write, onColumnVisibilityChange]
  )

  const toggleColumn = React.useCallback(
    (columnId: string) => {
      const next = new Set(hiddenIds)

      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }

      apply(next)
    },
    [apply, hiddenIds]
  )

  const setHidden = React.useCallback(
    (ids: string[]) => apply(new Set(ids)),
    [apply]
  )

  const isColumnHidden = React.useCallback(
    (columnId: string) => hiddenIds.has(columnId),
    [hiddenIds]
  )

  const visibleColumns = React.useMemo(
    () => columns.filter((column) => !hiddenIds.has(column.id)),
    [columns, hiddenIds]
  )

  /**
   * The full list, each column carrying whether it is currently hidden — what the panel lists.
   *
   * `isHidden` is always a real boolean here, never left `undefined`: the panel draws a checkbox
   * from it, and a tri-state value reaching a two-state control is how a checkbox ends up
   * uncontrolled. The identity check is therefore exact rather than truthy — a column with no
   * flag of its own is copied once so it can carry `false`.
   */
  const columnsWithVisibility = React.useMemo(
    () =>
      columns.map((column) => {
        const isHidden = hiddenIds.has(column.id)
        return column.isHidden === isHidden ? column : { ...column, isHidden }
      }),
    [columns, hiddenIds]
  )

  const hiddenColumnIds = React.useMemo(() => [...hiddenIds], [hiddenIds])

  // The ids, but the SAME array as last render when the contents match. This list is a dependency
  // of the async table's "does showing this column need a refetch?" check, and a fresh array
  // every render would make that check fire on every render.
  //
  // The identity comes from memoizing on a PRIMITIVE — the joined key — rather than from
  // remembering the previous array in a ref. A ref read and written during render is not a render
  // output, so React is free to discard the attempt, and `useMemo` on a string needs no such
  // bookkeeping. NUL is the separator because it cannot appear in a column id, so no id can
  // smuggle the separator into the key and split back out as two.
  const visibleColumnsKey = visibleColumns
    .map((column) => column.id)
    .join("\u0000")
  const visibleColumnIds = React.useMemo(
    () => (visibleColumnsKey === "" ? [] : visibleColumnsKey.split("\u0000")),
    [visibleColumnsKey]
  )

  return {
    hiddenIds,
    hiddenColumnIds,
    visibleColumns,
    visibleColumnIds,
    columnsWithVisibility,
    isColumnHidden,
    toggleColumn,
    setHidden,
  }
}
