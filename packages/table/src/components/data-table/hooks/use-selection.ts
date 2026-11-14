import type { SelectionState } from "../../../lib/table-state"
import * as React from "react"

export interface UseSelectionOptions<TRow> {
  /**
   * Every row the table has, after filtering and sorting but before paging — so "select all"
   * means all of what the user is looking at, not all of what the server holds.
   *
   * In `manual` mode this is the current page, because that is all there is.
   */
  allRows: TRow[]
  /** The rows on the current page. */
  visibleRows: TRow[]
  getRowId: (row: TRow, index: number) => React.Key
  /** Rows whose checkbox is disabled, and which "select all" skips. */
  excludedIds?: React.Key[]
  /** Server mode: the full dataset is never in hand, so there is nothing to select all of. */
  manual?: boolean
  /**
   * Offer "select all" even in `manual` mode, where it cannot be a list of ids: the selection
   * switches to `mode: 'all'` — every row matching the current filters, minus the ones unticked
   * since — and acting on it is the server's job. Off by default in `manual` mode, because it
   * needs an endpoint that understands "all matching"; on by default otherwise.
   */
  selectAllMatching?: boolean
  /** How many rows match, for counting an `'all'` selection. `manual` mode's `totalItems`. */
  totalItems?: number
  /**
   * Controlled: the ids that are ticked. A tick, "select all" and the rest then only report the
   * next set through `onSelectedIdsChange`; the boxes follow once the caller passes it back.
   */
  selectedIds?: readonly React.Key[]
  onSelectedIdsChange?: (selectedIds: React.Key[]) => void
}

/**
 * The selected ids, readable from outside React's render and subscribable one row at a time.
 *
 * It exists for the row checkboxes. Through context alone, every checkbox of a 500-row table would
 * re-render on every tick, because a context value that changes re-renders every consumer — the
 * `React.memo` on the row is no defence against that. Subscribed through `useSyncExternalStore`
 * with a selector of its own row, a checkbox re-renders only when ITS answer changes.
 */
export interface SelectionStore {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => ReadonlySet<React.Key>
}

function createSelectionStore(initial: ReadonlySet<React.Key>) {
  let ids = initial
  const listeners = new Set<() => void>()

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => ids,
    set: (next: ReadonlySet<React.Key>) => {
      if (next === ids) return

      ids = next
      listeners.forEach((listener) => listener())
    },
  }
}

/**
 * Which rows are ticked.
 *
 * Selection is held as a set of ids AND a map of the row objects behind them, because a caller
 * acting on a selection needs the rows, and in `manual` mode the rows for other pages are not on
 * screen to look up.
 *
 * Reading always prefers the LIVE row and falls back to the cached one. That single rule covers
 * both modes: a selected row still on screen is read fresh, so an edit made elsewhere is never
 * handed back stale, and a selected row that is not — another page, or filtered away — comes from
 * the cache instead of vanishing. It is also why there is no effect keeping the cache in step with
 * incoming data: nothing to keep in step, because the cache is only ever the fallback.
 *
 * Nothing here is persisted. A selection is about what the user is doing right now, and restoring
 * one from a previous visit would offer to act on rows that may no longer exist.
 */
export function useSelection<TRow>(options: UseSelectionOptions<TRow>) {
  const {
    allRows,
    visibleRows,
    getRowId,
    excludedIds,
    manual = false,
    selectAllMatching = !manual,
    totalItems,
    selectedIds: controlledIds,
    onSelectedIdsChange,
  } = options

  const isControlled = controlledIds !== undefined

  const [uncontrolledIds, setUncontrolledIds] = React.useState<Set<React.Key>>(
    () => new Set()
  )

  // `'all'` — every matching row, minus `unticked` — exists only where the rows cannot be listed:
  // a client-side table selects all by listing every id, exactly as before. Held here whether or
  // not the ids are controlled: a list of ids is what a controlled selection can describe, and
  // "all of them" is not one.
  // DECISION: `'all'` mode is held here even under controlled `selectedIds`, which can only
  // describe a list; `onSelectedIdsChange` still reports the ids in hand.
  const allMode = manual && selectAllMatching
  const [isAll, setIsAll] = React.useState(false)
  const [unticked, setUnticked] = React.useState<ReadonlySet<React.Key>>(
    () => new Set()
  )

  // Memoised on the caller's array, so the store below — and through it every checkbox — hears
  // about a new set only when the caller actually handed one over.
  const controlledSet = React.useMemo(
    () => (controlledIds === undefined ? undefined : new Set(controlledIds)),
    [controlledIds]
  )

  const [rowCache, setRowCache] = React.useState<Map<React.Key, TRow>>(
    () => new Map()
  )

  const excludedSet = React.useMemo(
    () => new Set(excludedIds ?? []),
    [excludedIds]
  )

  const rowsById = React.useMemo(() => {
    const map = new Map<React.Key, TRow>()

    allRows.forEach((row, index) => map.set(getRowId(row, index), row))

    return map
  }, [allRows, getRowId])

  // In `'all'` mode the ids are whatever rows are in hand — this page, and any remembered from
  // pages visited since — minus the unticked and the disabled. That keeps `selectedIds`,
  // `isRowSelected` and the per-row store meaning what they always meant for the rows on screen.
  const idsInAllMode = React.useMemo(() => {
    if (!isAll) return null

    const ids = new Set<React.Key>()

    for (const id of [...rowsById.keys(), ...rowCache.keys()]) {
      if (!unticked.has(id) && !excludedSet.has(id)) ids.add(id)
    }

    return ids
  }, [isAll, rowsById, rowCache, unticked, excludedSet])

  const selectedIds: ReadonlySet<React.Key> =
    idsInAllMode ?? controlledSet ?? uncontrolledIds
  const [store] = React.useState(() => createSelectionStore(selectedIds))

  const selectableIds = React.useMemo(
    () =>
      allRows
        .map((row, index) => getRowId(row, index))
        .filter((id) => !excludedSet.has(id)),
    [allRows, getRowId, excludedSet]
  )

  const pageIds = React.useMemo(
    () =>
      visibleRows
        .map((row, index) => getRowId(row, index))
        .filter((id) => !excludedSet.has(id)),
    [visibleRows, getRowId, excludedSet]
  )

  // One place where a new selection is committed, and the only place the consumer is told about
  // it. Outside any state updater: an updater can run twice for a single commit, and a consumer
  // whose `onSelectedIdsChange` fires a request would fire two.
  const apply = React.useCallback(
    (ids: Set<React.Key>, cache: Map<React.Key, TRow>) => {
      setRowCache(cache)
      setIsAll(false)
      setUnticked(new Set())

      if (!isControlled) {
        setUncontrolledIds(ids)
        // Into the store in the same handler, so the checkboxes that changed re-render in
        // the same commit as the table rather than one pass behind it.
        store.set(ids)
      }

      onSelectedIdsChange?.([...ids])
    },
    [isControlled, onSelectedIdsChange, store]
  )

  // The store follows whatever the committed selection is. After an uncontrolled `apply` this is
  // a no-op — the same set is already in it — so what it catches is a controlled selection
  // arriving from the caller, before the browser paints it.
  React.useLayoutEffect(() => {
    store.set(selectedIds)
  }, [store, selectedIds])

  /**
   * The row objects to remember for a set of ids: the one on screen if there is one, the one
   * already remembered otherwise. That fallback is what keeps a selection made on page 1 intact
   * while the user is on page 3.
   */
  const cacheFor = React.useCallback(
    (ids: Iterable<React.Key>, base: Map<React.Key, TRow>) => {
      const next = new Map<React.Key, TRow>()

      for (const id of ids) {
        const row = rowsById.get(id) ?? base.get(id)
        if (row !== undefined) next.set(id, row)
      }

      return next
    },
    [rowsById]
  )

  /**
   * The one place an `'all'` selection changes: which rows have been unticked since. The ids it
   * implies are reported like any other selection, so `onSelectedIdsChange` still hears about
   * every tick.
   */
  const applyUnticked = React.useCallback(
    (next: ReadonlySet<React.Key>) => {
      setIsAll(true)
      setUnticked(next)

      const ids = new Set<React.Key>()

      for (const id of [...rowsById.keys(), ...rowCache.keys()]) {
        if (!next.has(id) && !excludedSet.has(id)) ids.add(id)
      }

      setRowCache(cacheFor(ids, rowCache))
      onSelectedIdsChange?.([...ids])
    },
    [rowsById, rowCache, excludedSet, cacheFor, onSelectedIdsChange]
  )

  const selectAll = React.useCallback(() => {
    if (allMode) {
      applyUnticked(new Set())
      return
    }

    const ids = new Set(selectableIds)
    apply(ids, cacheFor(ids, rowCache))
  }, [allMode, applyUnticked, apply, cacheFor, selectableIds, rowCache])

  const deselectAll = React.useCallback(() => {
    apply(new Set(), new Map())
  }, [apply])

  const selectPage = React.useCallback(() => {
    if (isAll) {
      const next = new Set(unticked)
      pageIds.forEach((id) => next.delete(id))
      applyUnticked(next)
      return
    }

    const ids = new Set(selectedIds)
    pageIds.forEach((id) => ids.add(id))
    apply(ids, cacheFor(ids, rowCache))
  }, [
    isAll,
    unticked,
    applyUnticked,
    apply,
    cacheFor,
    selectedIds,
    pageIds,
    rowCache,
  ])

  const deselectPage = React.useCallback(() => {
    if (isAll) {
      const next = new Set(unticked)
      pageIds.forEach((id) => next.add(id))
      applyUnticked(next)
      return
    }

    const ids = new Set(selectedIds)
    pageIds.forEach((id) => ids.delete(id))
    apply(ids, cacheFor(ids, rowCache))
  }, [
    isAll,
    unticked,
    applyUnticked,
    apply,
    cacheFor,
    selectedIds,
    pageIds,
    rowCache,
  ])

  const toggleRow = React.useCallback(
    (rowId: React.Key) => {
      if (isAll) {
        const next = new Set(unticked)

        if (next.has(rowId)) next.delete(rowId)
        else next.add(rowId)

        applyUnticked(next)
        return
      }

      const ids = new Set(selectedIds)

      if (ids.has(rowId)) {
        ids.delete(rowId)
      } else {
        ids.add(rowId)
      }

      apply(ids, cacheFor(ids, rowCache))
    },
    [isAll, unticked, applyUnticked, apply, cacheFor, selectedIds, rowCache]
  )

  const setSelectedIdsExplicitly = React.useCallback(
    (ids: React.Key[]) => {
      const next = new Set(ids)
      apply(next, cacheFor(next, rowCache))
    },
    [apply, cacheFor, rowCache]
  )

  const isRowSelected = React.useCallback(
    (rowId: React.Key) => selectedIds.has(rowId),
    [selectedIds]
  )

  const isRowSelectable = React.useCallback(
    (rowId: React.Key) => !excludedSet.has(rowId),
    [excludedSet]
  )

  /**
   * Without the whole dataset there is nothing to select all OF — unless the caller has said the
   * server can act on "all matching" (`selectAllMatching`), in which case it is a mode, not a list.
   */
  const canSelectAll = manual ? allMode : selectAllMatching

  const isAllSelected = isAll
    ? unticked.size === 0
    : canSelectAll &&
      selectableIds.length > 0 &&
      selectableIds.every((id) => selectedIds.has(id))

  /**
   * How many rows the selection covers. In `'all'` mode that is every matching row the server
   * reported, less the unticked — not the handful of ids in hand.
   */
  const selectedCount = isAll
    ? Math.max((totalItems ?? selectableIds.length) - unticked.size, 0)
    : selectedIds.size

  const isPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const isPagePartiallySelected =
    !isPageSelected && pageIds.some((id) => selectedIds.has(id))

  /**
   * Something is selected, but not everything — counted over the WHOLE selection, not the page.
   * A row ticked on page one keeps the header box indeterminate while page two is showing, which
   * is the only hint the user has that the selection reaches past what they can see.
   */
  const isPartiallySelected = !isAllSelected && selectedCount > 0

  const selection = React.useMemo<SelectionState<TRow>>(() => {
    const ids = [...selectedIds]

    return {
      selectedIds: ids,
      selectedRows: ids
        .map((id) => rowsById.get(id) ?? rowCache.get(id))
        .filter((row): row is TRow => row !== undefined),
      mode: isAll ? "all" : "ids",
      excludedIds: isAll ? [...unticked] : [],
    }
  }, [selectedIds, rowCache, rowsById, isAll, unticked])

  return {
    selection,
    store: store as SelectionStore,
    selectedCount,
    canSelectAll,
    isAllSelected,
    isPartiallySelected,
    isPageSelected,
    isPagePartiallySelected,
    isRowSelected,
    isRowSelectable,
    selectAll,
    deselectAll,
    selectPage,
    deselectPage,
    toggleRow,
    setSelectedIds: setSelectedIdsExplicitly,
  }
}
