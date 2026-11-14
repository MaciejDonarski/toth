import { useTableStorage } from "../../../hooks/use-table-storage"
import { getPath } from "../../../lib/object"
import type { SortDirection, SortState } from "../../../lib/table-state"
import * as React from "react"

import type { DataTableColumn, DataTableSortOptions } from "../data-table.types"

/** Clicking a sortable header walks this, and `''` — no sort at all — is a real stop on it. */
const SORT_CYCLE: SortDirection[] = ["asc", "desc", ""]

const NO_SORT: SortState = { columnId: "", direction: "" }

function normalizeSort(value: Partial<SortState> | undefined): SortState {
  const direction = value?.direction ?? ""

  // A direction without a column, or a column without a direction, is not a sort. Collapsing both
  // to the same value means every "is anything sorted?" check is one comparison.
  if (direction !== "asc" && direction !== "desc") {
    return NO_SORT
  }

  return value?.columnId ? { columnId: value.columnId, direction } : NO_SORT
}

function getInitialSort<TRow>(
  columns: DataTableColumn<TRow>[],
  options: DataTableSortOptions | undefined,
  stored: Partial<SortState>
): SortState {
  const persisted = normalizeSort(stored)
  if (persisted.direction !== "") {
    return persisted
  }

  if (options?.defaultSort) {
    return normalizeSort(options.defaultSort)
  }

  // A column declaring `sortDir` is the last word — it is how a table says "open me newest first"
  // without the caller repeating the column id in an options bag.
  const seeded = columns.find((column) => column.sortDir)
  return seeded
    ? normalizeSort({ columnId: seeded.id, direction: seeded.sortDir })
    : NO_SORT
}

/**
 * Compares two cells.
 *
 * Blanks sort last in both directions, which is the one asymmetry here and a deliberate one: a
 * missing value is not the smallest value, and flipping the direction should not bring a page of
 * empty cells to the top.
 *
 * Everything that is not a pair of numbers is compared as text with `numeric: true`, so `item-2`
 * lands before `item-10` rather than after it.
 */
function compareValues(
  a: unknown,
  b: unknown,
  direction: SortDirection
): number {
  const aBlank = a === null || a === undefined || a === ""
  const bBlank = b === null || b === undefined || b === ""

  if (aBlank && bBlank) return 0
  if (aBlank) return 1
  if (bBlank) return -1

  const multiplier = direction === "desc" ? -1 : 1

  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * multiplier
  }

  return (
    String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * multiplier
  )
}

export interface UseSortOptions<TRow> {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
  columns: DataTableColumn<TRow>[]
  rows: TRow[]
  /** Server mode: the rows already arrive sorted, so only the state is tracked. */
  manual?: boolean
  sortOptions?: DataTableSortOptions
  /**
   * Controlled: the sort in force, owned by the caller. A click then only REPORTS the next sort
   * through `onSortChange`; the table follows once the caller passes it back. Nothing is read
   * from or written to storage while controlled — the caller owns the value, persistence too.
   */
  sort?: SortState
  onSortChange?: (sort: SortState) => void
}

/**
 * Which column the table is sorted by, and — unless the server did it — the rows in that order.
 *
 * The cell is read with `getPath`, so a column whose `id` is a dotted path sorts on the nested
 * value. The old grid indexed the row directly and silently sorted every such column by
 * `undefined`, which is to say not at all.
 */
export function useSort<TRow>(options: UseSortOptions<TRow>) {
  const {
    tableId,
    storageKey,
    userId,
    persistState = false,
    columns,
    rows,
    manual = false,
    sortOptions,
    sort: controlledSort,
    onSortChange,
  } = options

  const isControlled = controlledSort !== undefined

  const { read, write } = useTableStorage<Partial<SortState>>(
    storageKey,
    tableId,
    "sort",
    userId,
    persistState
  )

  const [uncontrolledSort, setUncontrolledSort] = React.useState<SortState>(
    () => getInitialSort(columns, sortOptions, isControlled ? {} : read())
  )

  // Normalised on its primitives, so a caller writing the object inline keeps one identity for
  // as long as the sort itself does.
  const controlledColumnId = controlledSort?.columnId
  const controlledDirection = controlledSort?.direction

  const sort = React.useMemo(
    () =>
      isControlled
        ? normalizeSort({
            columnId: controlledColumnId,
            direction: controlledDirection,
          })
        : uncontrolledSort,
    [isControlled, controlledColumnId, controlledDirection, uncontrolledSort]
  )

  // Persisting and reporting happen here rather than inside a state updater. An updater may run
  // more than once for one commit — StrictMode does it deliberately — and a localStorage write or
  // a consumer's callback running twice per click is a bug that only shows up in production
  // builds by NOT showing up in development ones.
  const apply = React.useCallback(
    (next: SortState) => {
      if (!isControlled) {
        setUncontrolledSort(next)
        write(next)
      }

      onSortChange?.(next)
    },
    [isControlled, write, onSortChange]
  )

  /** Advances one step round the cycle for that column, or starts a fresh ascending sort. */
  const onSort = React.useCallback(
    (columnId: string) => {
      const direction =
        sort.columnId === columnId
          ? SORT_CYCLE[
              (SORT_CYCLE.indexOf(sort.direction) + 1) % SORT_CYCLE.length
            ]
          : "asc"

      apply(normalizeSort({ columnId, direction }))
    },
    [apply, sort]
  )

  const setSort = React.useCallback(
    (next: Partial<SortState>) => apply(normalizeSort(next)),
    [apply]
  )

  const reset = React.useCallback(() => apply(NO_SORT), [apply])

  const sortedRows = React.useMemo(() => {
    if (manual || !sort.columnId || !sort.direction) {
      return rows
    }

    return [...rows].sort((a, b) =>
      compareValues(
        getPath(a, sort.columnId),
        getPath(b, sort.columnId),
        sort.direction
      )
    )
  }, [rows, sort, manual])

  /** What the header needs to draw one column's control. */
  const getSortDirection = React.useCallback(
    (columnId: string): SortDirection =>
      sort.columnId === columnId ? sort.direction : "",
    [sort]
  )

  return { sort, sortedRows, onSort, setSort, reset, getSortDirection }
}
