import type { ColumnAlignMap } from "../components/plain-table/hooks"
import type { PlainTableColumnAlign } from "../components/plain-table/types"
import type { FilteringState } from "./filter-types"
import type { TableSnapshot } from "./table-registry"
import { getScope, getSnapshot, subscribe } from "./table-registry"
import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnPinSide,
  ColumnVisibilityState,
  PaginationState,
  SelectionState,
  SortState,
} from "./table-state"
import type * as React from "react"

/**
 * Imperative control of a mounted table, by id.
 *
 *   tableApi.setSort('orders', { columnId: 'sku', direction: 'asc' });
 *   const rows = tableApi.getSelectedRows('orders');
 *   const stop = tableApi.subscribe('orders', (snapshot) => …);
 *
 * This is the hatch, not the front door: anything a caller can say through props should be said
 * through props, where React can see it. It exists for the cases that are genuinely outside the
 * tree that renders the table — a toolbar in another branch of the app, an app-level keyboard
 * shortcut, a plugin refreshing the grid after a mutation it ran itself.
 *
 * A call against a table that is not mounted, or a scope it does not own, is a no-op for a setter
 * and `undefined` for a getter — with a warning, because it is nearly always a typo'd id or a call
 * that ran before the table mounted, and silence there costs an afternoon.
 */

function resolveScope(id: string, scope: string) {
  const scopeApi = getScope(id, scope)

  if (!scopeApi) {
    console.warn(`[table] No "${scope}" scope registered for table id "${id}".`)
    return undefined
  }

  return scopeApi
}

function readState<TState>(id: string, scope: string): TState | undefined {
  return resolveScope(id, scope)?.getState() as TState | undefined
}

function callAction(
  id: string,
  scope: string,
  action: string,
  ...args: unknown[]
): void {
  const scopeApi = resolveScope(id, scope)
  scopeApi?.actions[action]?.(...(args as never[]))
}

export const tableApi = {
  // ===================== sort =====================
  getSort: (id: string) => readState<SortState>(id, "sort"),
  setSort: (id: string, sort: SortState) =>
    callAction(id, "sort", "setSort", sort),
  resetSort: (id: string) => callAction(id, "sort", "reset"),

  // ===================== pagination =====================
  getPagination: (id: string) => readState<PaginationState>(id, "pagination"),
  setPage: (id: string, page: number) =>
    callAction(id, "pagination", "setPage", page),
  setPageSize: (id: string, size: number) =>
    callAction(id, "pagination", "setPageSize", size),

  // ===================== selection =====================
  getSelection: (id: string) => readState<SelectionState>(id, "selection"),
  /** The selected row objects — the reason selection holds rows and not only ids. */
  getSelectedRows: <TRow = unknown>(id: string) =>
    readState<SelectionState<TRow>>(id, "selection")?.selectedRows,
  setSelectedIds: (id: string, ids: React.Key[]) =>
    callAction(id, "selection", "setSelectedIds", ids),
  selectAll: (id: string) => callAction(id, "selection", "selectAll"),
  deselectAll: (id: string) => callAction(id, "selection", "deselectAll"),
  selectPage: (id: string) => callAction(id, "selection", "selectPage"),
  deselectPage: (id: string) => callAction(id, "selection", "deselectPage"),
  toggleRow: (id: string, rowId: React.Key) =>
    callAction(id, "selection", "toggleRow", rowId),

  // ===================== column visibility =====================
  getColumnVisibility: (id: string) =>
    readState<ColumnVisibilityState>(id, "columnVisibility"),
  setHiddenColumns: (id: string, hiddenIds: string[]) =>
    callAction(id, "columnVisibility", "setHidden", hiddenIds),
  toggleColumn: (id: string, columnId: string) =>
    callAction(id, "columnVisibility", "toggleColumn", columnId),

  // ===================== column order =====================
  getColumnOrder: (id: string) =>
    readState<ColumnOrderState>(id, "columnOrder"),
  setColumnOrder: (id: string, order: string[]) =>
    callAction(id, "columnOrder", "setOrder", order),

  // ===================== column pinning =====================
  getColumnPinning: (id: string) =>
    readState<ColumnPinningState>(id, "columnPinning"),
  setColumnPinning: (id: string, pinning: ColumnPinningState) =>
    callAction(id, "columnPinning", "setPinning", pinning),
  pinColumn: (id: string, columnId: string, side: ColumnPinSide) =>
    callAction(id, "columnPinning", "setPin", columnId, side),

  // ===================== filtering =====================
  getFiltering: (id: string) => readState<FilteringState>(id, "filtering"),
  setFiltering: (id: string, filtering: FilteringState) =>
    callAction(id, "filtering", "setFiltering", filtering),
  setSearch: (id: string, value: string) =>
    callAction(id, "filtering", "setSearch", value),
  clearFilter: (id: string, field: string) =>
    callAction(id, "filtering", "clearFilter", field),
  /** Clears the field filters and keeps the search term — what the panel's "Reset all" does. */
  clearFilters: (id: string) => callAction(id, "filtering", "clearFilters"),
  /** Clears everything, search included. */
  clearAll: (id: string) => callAction(id, "filtering", "clearAll"),

  // ===================== column align (PlainTable's own) =====================
  getColumnAlign: (id: string, columnId?: string) => {
    const map = readState<ColumnAlignMap>(id, "columnAlign")
    return columnId === undefined ? map : map?.[columnId]
  },
  setColumnAlign: (
    id: string,
    columnId: string,
    align: PlainTableColumnAlign
  ) => callAction(id, "columnAlign", "setAlign", columnId, align),
  toggleColumnAlign: (id: string, columnId: string) =>
    callAction(id, "columnAlign", "toggleAlign", columnId),

  // ===================== refresh (AsyncDataTable's own) =====================
  /**
   * Refetches the current server state.
   *
   * Registered by `AsyncDataTable` only — a plain `DataTable` owns no data to refetch, so this
   * warns and does nothing there.
   */
  refresh: (id: string) => callAction(id, "refresh", "refresh"),

  // ===================== shared =====================
  getSnapshot: (id: string): TableSnapshot | undefined => getSnapshot(id),
  subscribe: (id: string, listener: (snapshot: TableSnapshot) => void) =>
    subscribe(id, listener),
}
