import { useTableStorage } from "../../../hooks/use-table-storage"
import * as React from "react"

import type { DataTableDensity } from "../data-table.types"

/** What the user chose in View options, as stored — only what they changed. */
interface ViewOverrides extends Record<string, unknown> {
  density?: DataTableDensity
  columnDividers?: boolean
}

export interface UseViewOptionsOptions {
  storageKey: string
  tableId?: string
  userId?: string | number
  persistState?: boolean
  /** The table's own default, from its props or a `DataTableConfigProvider`. */
  density: DataTableDensity
  columnDividers: boolean
  onDensityChange?: (density: DataTableDensity) => void
  onColumnDividersChange?: (columnDividers: boolean) => void
}

/**
 * Row density and column dividers — the two View options a `DataTable` itself owns.
 *
 * The props are the starting point and the user's choice wins over them, the rule alignment and
 * widths already follow: only what the user changed is held (and, with `persistState`, stored), so
 * an app that later changes its default still reaches every user who never touched the setting.
 */
export function useViewOptions({
  storageKey,
  tableId,
  userId,
  persistState = false,
  density: defaultDensity,
  columnDividers: defaultDividers,
  onDensityChange,
  onColumnDividersChange,
}: UseViewOptionsOptions) {
  const { read, write } = useTableStorage<ViewOverrides>(
    storageKey,
    tableId,
    "view",
    userId,
    persistState
  )
  const [overrides, setOverrides] = React.useState<ViewOverrides>(() => read())

  // Outside any updater, so the storage write and the callback run once per change.
  const apply = React.useCallback(
    (next: ViewOverrides) => {
      setOverrides(next)
      write(next)
    },
    [write]
  )

  const setDensity = React.useCallback(
    (density: DataTableDensity) => {
      apply({ ...overrides, density })
      onDensityChange?.(density)
    },
    [apply, overrides, onDensityChange]
  )

  const setColumnDividers = React.useCallback(
    (columnDividers: boolean) => {
      apply({ ...overrides, columnDividers })
      onColumnDividersChange?.(columnDividers)
    },
    [apply, overrides, onColumnDividersChange]
  )

  const reset = React.useCallback(() => apply({}), [apply])

  return {
    density: overrides.density ?? defaultDensity,
    columnDividers: overrides.columnDividers ?? defaultDividers,
    setDensity,
    setColumnDividers,
    reset,
  }
}
