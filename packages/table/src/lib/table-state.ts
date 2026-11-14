import type { FilteringState } from "./filter-types"
import type * as React from "react"

// The shapes a composed table publishes — through `onStateChange`, and through the registry under
// the scopes reserved for it in `table-registry.ts`.
//
// They live in `lib` rather than beside the component because they are the registry's contract:
// `tableApi.getSort(id)` has to describe what it returns without depending on the component that
// happens to have registered it.

/** `''` is a real third state: sorting cycles ascending → descending → off. */
export type SortDirection = "asc" | "desc" | ""

export interface SortState {
  columnId: string
  direction: SortDirection
}

export interface PaginationState {
  /** One-based, because it is what the pager shows. */
  currentPage: number
  pageSize: number
  /** In `manual` mode this is what the server reported; otherwise the row count. */
  totalItems: number
  totalPages: number
}

export interface SelectionState<TRow = unknown> {
  selectedIds: React.Key[]
  /**
   * The selected rows themselves, not just their ids.
   *
   * In `manual` mode the rows for other pages are not on screen, so the table holds on to the row
   * objects it has seen. Without that, "select 30 across three pages, then act on them" would
   * hand the caller ten rows and twenty bare ids.
   */
  selectedRows: TRow[]
  /**
   * What the selection means. `'ids'` — exactly `selectedIds`. `'all'` — every row matching the
   * current filtering, except `excludedIds`; `selectedIds` then lists only the rows in hand, and
   * acting on the selection means sending the filtering to the server rather than the ids.
   * Absent reads as `'ids'`.
   */
  mode?: SelectionMode
  /** In `'all'` mode, the rows unticked since everything was selected. Empty otherwise. */
  excludedIds?: React.Key[]
}

/** Whether a selection is a list of ids, or "everything matching, minus some". */
export type SelectionMode = "ids" | "all"

export interface ColumnVisibilityState {
  hiddenIds: string[]
}

export interface ColumnOrderState {
  order: string[]
}

/** Which side a column is pinned to, if any. */
export type ColumnPinSide = "left" | "right" | false

export interface ColumnPinningState {
  left: string[]
  right: string[]
}

/** Everything a table knows about how it is currently being looked at. */
export interface DataTableState<TRow = unknown> {
  sort: SortState
  filtering: FilteringState
  pagination: PaginationState
  selectedIds: React.Key[]
  selectedRows: TRow[]
  /** See `SelectionState.mode`. Absent reads as `'ids'`. */
  selectionMode?: SelectionMode
  /** See `SelectionState.excludedIds`. */
  selectionExcludedIds?: React.Key[]
  hiddenColumns: string[]
  visibleColumns: string[]
}
