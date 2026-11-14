import { useTableStorage } from "../../../hooks/use-table-storage"
import * as React from "react"

import { columnTypeAlign } from "../column-types"
import type { PlainTableColumn, PlainTableColumnAlign } from "../types"

const DEFAULT_ALIGN: PlainTableColumnAlign = "left"

/** The cycle the header's align button walks, one click at a time. */
const NEXT_ALIGN: Record<PlainTableColumnAlign, PlainTableColumnAlign> = {
  left: "center",
  center: "right",
  right: "left",
}

function normalizeAlign(value: unknown): PlainTableColumnAlign {
  return value === "center" || value === "right" || value === "left"
    ? value
    : DEFAULT_ALIGN
}

export interface UseColumnAlignOptions {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
}

export type ColumnAlignMap = Record<string, PlainTableColumnAlign>

/**
 * Per-column alignment: the column's own `align` as the baseline, the user's clicks layered over
 * it, and only that layer persisted.
 *
 * Storing the overrides rather than the merged result is what lets a later change to a column's
 * `align` in code still reach every user who never touched that column.
 *
 * The updaters close over current state rather than reading it back through a ref: React hands
 * an event the handler from the latest render, so there is no stale closure to guard against.
 */
export function useColumnAlign<TRow>(
  columns: PlainTableColumn<TRow>[],
  options: UseColumnAlignOptions
) {
  const { tableId, storageKey, userId, persistState } = options

  const { read, write } = useTableStorage<ColumnAlignMap>(
    storageKey,
    tableId,
    "columnAlign",
    userId,
    persistState
  )

  // The baseline, in order: the column's own `align`, then the one its `type` implies, then
  // `left`. Both sit in the DEFAULTS layer, so a user's click still wins over either and stays
  // the only thing persisted.
  const defaults = React.useMemo<ColumnAlignMap>(() => {
    const map: ColumnAlignMap = {}

    for (const column of columns) {
      if (column.id) {
        map[column.id] = normalizeAlign(
          column.align ?? columnTypeAlign(column.type)
        )
      }
    }

    return map
  }, [columns])

  // Read once, on mount: `read` hits localStorage and JSON.parse, and re-running it on every
  // render would be pure waste.
  const [overrides, setOverrides] = React.useState<ColumnAlignMap>(() => {
    const sanitized: ColumnAlignMap = {}

    for (const [columnId, align] of Object.entries(read())) {
      sanitized[columnId] = normalizeAlign(align)
    }

    return sanitized
  })

  // Commits outside the state updater, never inside one: an updater can run more than once per
  // commit (StrictMode, a re-render mid-transition) and the localStorage write would run with it.
  const apply = React.useCallback(
    (next: ColumnAlignMap) => {
      setOverrides(next)
      write(next)
    },
    [write]
  )

  const getAlign = React.useCallback(
    (columnId: string): PlainTableColumnAlign =>
      overrides[columnId] ?? defaults[columnId] ?? DEFAULT_ALIGN,
    [overrides, defaults]
  )

  const setAlign = React.useCallback(
    (columnId: string, align: PlainTableColumnAlign) => {
      apply({ ...overrides, [columnId]: normalizeAlign(align) })
    },
    [apply, overrides]
  )

  /**
   * Advances one step round the cycle, from the alignment currently in effect.
   *
   * Not from the stored override alone, which is what the old component did: the first click on
   * an `align: "right"` column set `center`, the next set `right`, and `left` was unreachable.
   */
  const toggleAlign = React.useCallback(
    (columnId: string) => {
      const current = overrides[columnId] ?? defaults[columnId] ?? DEFAULT_ALIGN

      apply({ ...overrides, [columnId]: NEXT_ALIGN[current] })
    },
    [apply, overrides, defaults]
  )

  const resetAlign = React.useCallback(
    (columnId: string) => {
      if (!(columnId in overrides)) return

      const next = { ...overrides }
      delete next[columnId]
      apply(next)
    },
    [apply, overrides]
  )

  const resetAllAligns = React.useCallback(() => {
    if (Object.keys(overrides).length === 0) return

    apply({})
  }, [apply, overrides])

  return {
    getAlign,
    setAlign,
    toggleAlign,
    resetAlign,
    resetAllAligns,
    overrides,
  }
}
