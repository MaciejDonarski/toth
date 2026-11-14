import { useTableStorage } from "../../../hooks/use-table-storage"
import type {
  ColumnPinningState,
  ColumnPinSide,
} from "../../../lib/table-state"
import * as React from "react"

import type { DataTableColumn } from "../data-table.types"

const NO_PINNING: ColumnPinningState = { left: [], right: [] }

function getInitialPinning<TRow>(
  columns: DataTableColumn<TRow>[],
  stored: Partial<ColumnPinningState>
): ColumnPinningState {
  // As with visibility, a stored state wins even when both sides are empty: that is a user who
  // unpinned everything, not a user who has never pinned anything.
  if (Array.isArray(stored.left) || Array.isArray(stored.right)) {
    return {
      left: Array.isArray(stored.left) ? stored.left : [],
      right: Array.isArray(stored.right) ? stored.right : [],
    }
  }

  const left: string[] = []
  const right: string[] = []

  for (const column of columns) {
    if (column.stickyLeft) left.push(column.id)
    else if (column.stickyRight) right.push(column.id)
  }

  return { left, right }
}

/**
 * Rewrites each column's `stickyLeft` / `stickyRight` from the pinning state.
 *
 * The state is authoritative, not additive: a column the user unpinned comes back with both flags
 * false even though its declaration said sticky. A column object is returned UNCHANGED when its
 * flags already agree, so `PlainTable` — which partitions on those flags — is not handed a new
 * object for every column on every render.
 */
function applyPinning<TRow>(
  columns: DataTableColumn<TRow>[],
  pinning: ColumnPinningState
): DataTableColumn<TRow>[] {
  const leftSet = new Set(pinning.left)
  const rightSet = new Set(pinning.right)

  return columns.map((column) => {
    const stickyLeft = leftSet.has(column.id)
    // Left wins if a state somehow claims both, so a column is never sticky to two edges.
    const stickyRight = !stickyLeft && rightSet.has(column.id)

    if (
      Boolean(column.stickyLeft) === stickyLeft &&
      Boolean(column.stickyRight) === stickyRight
    ) {
      return column
    }

    return { ...column, stickyLeft, stickyRight }
  })
}

export interface UseColumnPinningOptions<TRow> {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
  columns: DataTableColumn<TRow>[]
  onColumnPinningChange?: (state: ColumnPinningState) => void
}

/** Which columns are frozen to which edge. */
export function useColumnPinning<TRow>(options: UseColumnPinningOptions<TRow>) {
  const {
    tableId,
    storageKey,
    userId,
    persistState = false,
    columns,
    onColumnPinningChange,
  } = options

  const { read, write } = useTableStorage<Partial<ColumnPinningState>>(
    storageKey,
    tableId,
    "columnPinning",
    userId,
    persistState
  )

  // The plain setter name is the public one this hook returns, which also persists.
  // eslint-disable-next-line @eslint-react/use-state
  const [pinning, setPinningState] = React.useState<ColumnPinningState>(() =>
    getInitialPinning(columns, read())
  )

  const apply = React.useCallback(
    (next: ColumnPinningState) => {
      setPinningState(next)
      write(next)
      onColumnPinningChange?.(next)
    },
    [write, onColumnPinningChange]
  )

  /** Pins a column to one edge, or unpins it with `false`. The two sides are exclusive. */
  const setPin = React.useCallback(
    (columnId: string, side: ColumnPinSide) => {
      const next: ColumnPinningState = {
        left: pinning.left.filter((id) => id !== columnId),
        right: pinning.right.filter((id) => id !== columnId),
      }

      if (side === "left") next.left.push(columnId)
      else if (side === "right") next.right.push(columnId)

      apply(next)
    },
    [apply, pinning]
  )

  const setPinning = React.useCallback(
    (next: Partial<ColumnPinningState>) =>
      apply({
        left: Array.isArray(next.left) ? next.left : [],
        right: Array.isArray(next.right) ? next.right : [],
      }),
    [apply]
  )

  const reset = React.useCallback(() => apply(NO_PINNING), [apply])

  const getPinSide = React.useCallback(
    (columnId: string): ColumnPinSide => {
      if (pinning.left.includes(columnId)) return "left"
      if (pinning.right.includes(columnId)) return "right"
      return false
    },
    [pinning]
  )

  const pinnedColumns = React.useMemo(
    () => applyPinning(columns, pinning),
    [columns, pinning]
  )

  return { pinning, pinnedColumns, setPin, setPinning, getPinSide, reset }
}
