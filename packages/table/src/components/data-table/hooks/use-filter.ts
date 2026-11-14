import { useTableStorage } from "../../../hooks/use-table-storage"
import type { DataTableFilter, FilteringState } from "../../../lib/filter-types"
import { getInitialFiltering } from "../../../lib/filter-types"
import { omitKeys } from "../../../lib/object"
import {
  buildSearchEntry,
  omitSearch,
  pickSearch,
  sanitizeFiltering,
  SEARCH_KEY,
} from "../../../lib/search-filtering"
import * as React from "react"

export interface UseFilterOptions {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
  filters: readonly DataTableFilter[]
  /**
   * Sends the table back to page 1, filled in by `DataTable` once pagination exists.
   *
   * A ref because of an ordering knot: filtering has to be resolved BEFORE pagination — the rows
   * are filtered, then sorted, then sliced — so the filter hook runs first and cannot be handed a
   * function the pagination hook has not returned yet.
   *
   * `DataTable` fills it in from an effect rather than during render. Effects have run long
   * before a user can touch a filter, and the two state updates still land in one commit because
   * they happen in the same event handler: one render, and — in a server-backed table — one
   * request. Without it, a filter change fetches page 7 of the new result set and then page 1 of
   * it, and the user sees the wrong rows flash by.
   */
  resetPageRef?: React.RefObject<(() => void) | null>
  /**
   * Controlled: the filtering in force, search term included under its reserved key. Every change
   * — the panel, a chip, the search box — is then only reported through `onFilteringChange`, and
   * nothing is read from or written to storage.
   */
  filtering?: FilteringState
  onFilteringChange?: (filtering: FilteringState) => void
}

/**
 * What the table is filtered by: one entry per field filter, plus the search term under its own
 * reserved key.
 *
 * Every mutation goes through `apply`, so there is exactly one place that drops a blank search
 * term, persists, resets the page and tells the consumer.
 */
export function useFilter(options: UseFilterOptions) {
  const {
    tableId,
    storageKey,
    userId,
    persistState = false,
    filters,
    resetPageRef,
    filtering: controlledFiltering,
    onFilteringChange,
  } = options

  const isControlled = controlledFiltering !== undefined

  const { read, write } = useTableStorage<FilteringState>(
    storageKey,
    tableId,
    "filtering",
    userId,
    persistState
  )

  const [uncontrolledFiltering, setUncontrolledFiltering] =
    React.useState<FilteringState>(() =>
      isControlled
        ? {}
        : sanitizeFiltering(getInitialFiltering(filters, read()))
    )

  // Memoised on the caller's object: the client-side filter pass downstream is keyed on this
  // identity, and sanitising on every render would re-run it on every render.
  const controlled = React.useMemo(
    () =>
      controlledFiltering === undefined
        ? undefined
        : sanitizeFiltering(controlledFiltering),
    [controlledFiltering]
  )

  const filtering = controlled ?? uncontrolledFiltering

  const apply = React.useCallback(
    (next: FilteringState) => {
      const sanitized = sanitizeFiltering(next)

      if (!isControlled) {
        setUncontrolledFiltering(sanitized)
        write(sanitized)
      }

      // A narrower result set invalidates whatever page the user was on.
      resetPageRef?.current?.()
      onFilteringChange?.(sanitized)
    },
    [isControlled, write, resetPageRef, onFilteringChange]
  )

  const setSearch = React.useCallback(
    (value: string) => {
      apply({ ...omitSearch(filtering), [SEARCH_KEY]: buildSearchEntry(value) })
    },
    [apply, filtering]
  )

  /** Drops one field filter, leaving the rest and the search term alone. */
  const clearFilter = React.useCallback(
    (field: string) => apply(omitKeys(filtering, [field])),
    [apply, filtering]
  )

  /**
   * Clears the field filters and KEEPS the search term — what the panel's "Reset all" does.
   * The search box is a separate control, and emptying it from inside the panel would look like
   * the panel had reached outside itself.
   */
  const clearFilters = React.useCallback(
    () => apply(pickSearch(filtering)),
    [apply, filtering]
  )

  /** Clears everything, search included — what the active-filter row's "Clear all" chip does. */
  const clearAll = React.useCallback(() => apply({}), [apply])

  return {
    filtering,
    setFiltering: apply,
    setSearch,
    clearFilter,
    clearFilters,
    clearAll,
  }
}
