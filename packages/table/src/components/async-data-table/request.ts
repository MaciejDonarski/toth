import type { DataTableColumn } from "../data-table/data-table.types"
import { prepareServerFiltering } from "../../lib/apply-filters"
import type { DataTableFilter } from "../../lib/filter-types"
import type { DataTableState, SortState } from "../../lib/table-state"

import type {
  DataTableRequest,
  DataTableSorting,
} from "./async-data-table.types"

// Turning a table's state into a request, and deciding whether it is a DIFFERENT request from the
// last one. Pure, so both decisions can be tested without a network or a component.

/** The field to sort by: an explicit override, else the column's field, else its id. */
export function resolveSorting<TRow>(
  sort: SortState,
  columns: readonly DataTableColumn<TRow>[]
): DataTableSorting | undefined {
  if (!sort.columnId || !sort.direction) {
    return undefined
  }

  const column = columns.find((candidate) => candidate.id === sort.columnId)

  return {
    columnId: sort.columnId,
    dir: sort.direction,
    field: column?.sortField ?? column?.field ?? sort.columnId,
  }
}

/** The server fields behind a list of column ids. */
export function resolveFields<TRow>(
  columnIds: readonly string[],
  columns: readonly DataTableColumn<TRow>[]
): string[] {
  return columnIds.map((columnId) => {
    const column = columns.find((candidate) => candidate.id === columnId)
    return column?.field ?? columnId
  })
}

/** Every field an export could ask for, including the extra ones a composite column draws from. */
export function resolveExportFields<TRow>(
  columnIds: readonly string[],
  columns: readonly DataTableColumn<TRow>[]
): string[] {
  const fields = new Set<string>()

  for (const columnId of columnIds) {
    const column = columns.find((candidate) => candidate.id === columnId)

    if (column?.exportFields?.length) {
      column.exportFields.forEach((field) => fields.add(field))
    } else {
      fields.add(column?.field ?? columnId)
    }
  }

  return [...fields]
}

export function buildRequest<TRow>(
  state: DataTableState<TRow>,
  columns: readonly DataTableColumn<TRow>[],
  filters: readonly DataTableFilter[]
): DataTableRequest {
  return {
    fields: resolveFields(state.visibleColumns, columns),
    pagination: {
      currentPage: state.pagination.currentPage,
      pageSize: state.pagination.pageSize,
    },
    sorting: resolveSorting(state.sort, columns),
    filtering: prepareServerFiltering(state.filtering, filters),
  }
}

/**
 * Sorts every key, however deep, so the same filtering always serializes the same way.
 *
 * A shallow sort would not do: an envelope is `{ operator, value }` or `{ value, operator }`
 * depending on which branch built it, and two spellings of one filter would look like two
 * different filters and cost a request each.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {}

    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key])
    }

    return sorted
  }

  return value
}

/**
 * The part of the state that always means a new request: which page, how big, sorted how, filtered
 * by what.
 *
 * The selection is deliberately absent — ticking a row changes nothing the server was asked. So is
 * column visibility, which is handled separately: HIDING a column never refetches, and showing one
 * only does when its field was never fetched. See `hasUnfetchedField`.
 */
export function serverKey<TRow>(state: DataTableState<TRow>): string {
  const { currentPage, pageSize } = state.pagination
  const { columnId, direction } = state.sort

  return [
    currentPage,
    pageSize,
    columnId,
    direction,
    JSON.stringify(canonicalize(state.filtering)),
  ].join("|")
}

/**
 * Whether the columns now on screen need something the last request did not ask for.
 *
 * This is what makes showing a column cheap when its data is already in hand and correct when it
 * is not — the difference between a table that refetches every time someone opens the column panel
 * and one that renders a column of blanks.
 */
export function hasUnfetchedField(
  fields: readonly string[],
  fetched: Set<string> | null
): boolean {
  // Nothing fetched yet: the first request has not gone out, so everything is unfetched.
  if (fetched === null) return true

  return fields.some((field) => !fetched.has(field))
}
