import { useAsyncDataTableConfig } from "../data-table/config-context"
import { DataTable } from "../data-table/data-table"
import { DATA_TABLE_STORAGE_KEY } from "../data-table/data-table.constants"
import type {
  DataTableActionEntry,
  DataTableColumn,
} from "../data-table/data-table.types"
import { useRegisterTableScope } from "../../hooks/use-register-table-scope"
import { prepareServerFiltering } from "../../lib/apply-filters"
import type { DataTableFilter } from "../../lib/filter-types"
import type { DataTableState } from "../../lib/table-state"
import * as React from "react"

import type {
  AsyncDataTableBaseProps,
  AsyncDataTableProps,
  DataTablePlugin,
} from "./async-data-table.types"
import {
  AsyncDataTableFooter,
  AsyncDataTableLastUpdateProvider,
} from "./async-data-table-footer"
import {
  AsyncAutoRefreshProvider,
  AsyncAutoRefreshSection,
} from "./auto-refresh-section"
import { useExport } from "./hooks/use-export"
import { useRefresh } from "./hooks/use-refresh"
import { useSearchableFields } from "./hooks/use-searchable-fields"
import {
  buildRequest,
  hasUnfetchedField,
  resolveFields,
  serverKey,
} from "./request"

// `DataTable` against a server.
//
// It owns no data of its own. It renders a `DataTable` in `manual` mode — which tracks the state
// and reports it rather than acting on it — and turns each report into a `getData` call when, and
// only when, the server was actually asked something different. The rows come back through props,
// like any other data the application holds.
//
// The whole component is about that "when, and only when". Every table in a product refetches on
// paging, sorting and filtering; the ones that feel broken are the ones that also refetch on a
// selection, on a column being hidden, or twice for one filter change.

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null)?.then === "function"
}

function AsyncDataTableBase<TRow>(ownProps: AsyncDataTableBaseProps<TRow>) {
  // Defaults, then whatever a `DataTableConfigProvider` above sets, then this call's own props —
  // the same merge `DataTable` runs, here because these props never reach it: `refreshOptions`
  // is this layer's, and so is the storage its auto-refresh choice is kept in. Inside the
  // plugin host, so what a plugin passes down counts as the table's own.
  const props = useAsyncDataTableConfig<TRow>(ownProps)
  const {
    getData,
    refreshToken,
    refreshOptions,
    withExport = false,
    exportOptions,
    withLastUpdate = false,
    getSearchableFields,
    onStateChange,
    rightActions,
    headerActions,
    bulkActions,
    searchOptions,
    loading,
    slots,
    columns,
    filters,
    withSearch,
    ...rest
  } = props

  const [lastUpdate, setLastUpdate] = React.useState<number | null>(null)

  // Read at the moment a request is built rather than closed over when a handler was made. The
  // state change that triggers a fetch and the props describing how to build it arrive in
  // different renders, and a stale `columns` here would ask for the wrong fields.
  const getDataRef = React.useRef(getData)
  const columnsRef = React.useRef<readonly DataTableColumn<TRow>[]>(columns)
  const filtersRef = React.useRef<readonly DataTableFilter[]>(filters ?? [])
  const onStateChangeRef = React.useRef(onStateChange)

  React.useEffect(() => {
    getDataRef.current = getData
    columnsRef.current = columns
    filtersRef.current = filters ?? []
    onStateChangeRef.current = onStateChange
  })

  const stateRef = React.useRef<DataTableState<TRow> | null>(null)
  const lastServerKeyRef = React.useRef<string | null>(null)
  /** The fields the most recent request asked for — what "already fetched" means. */
  const fetchedFieldsRef = React.useRef<Set<string> | null>(null)

  /** The request in flight, if any — the one a newer request aborts. */
  const inFlightRef = React.useRef<AbortController | null>(null)

  const requestData = React.useCallback((state: DataTableState<TRow>) => {
    const request = buildRequest(state, columnsRef.current, filtersRef.current)

    lastServerKeyRef.current = serverKey(state)
    fetchedFieldsRef.current = new Set(request.fields)

    // One question at a time. Paging twice quickly asks two questions, and whichever answer
    // lands LAST would otherwise win — which is not necessarily the one for the page on screen.
    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller

    const result = getDataRef.current(request, { signal: controller.signal })

    if (!isPromiseLike(result)) {
      // Nothing to wait for: the rows come back through props whenever they come, and the
      // request is the only moment this layer knows about.
      setLastUpdate(Date.now())
      return
    }

    result.then(
      () => {
        // Superseded while it was in flight: whatever it brought back is not what is on
        // screen, so it does not get to say when that was fetched.
        if (controller.signal.aborted) return

        inFlightRef.current = null
        setLastUpdate(Date.now())
      },
      () => {
        // Rejections are the caller's to report — through `error` — and an abort is
        // expected to reject. Handled here only so neither surfaces as unhandled.
        if (inFlightRef.current === controller) inFlightRef.current = null
      }
    )
  }, [])

  // An answer arriving after the table is gone has nowhere to go. The key is forgotten with it,
  // so a remount under StrictMode — cleanup, then every effect again — asks once more for what
  // the aborted request was asking for, rather than concluding it has already been asked.
  React.useEffect(
    () => () => {
      inFlightRef.current?.abort()
      inFlightRef.current = null
      lastServerKeyRef.current = null
    },
    []
  )

  const handleStateChange = React.useCallback(
    (state: DataTableState<TRow>) => {
      stateRef.current = state

      const changed = serverKey(state) !== lastServerKeyRef.current
      // Showing a column only costs a request when its data was never asked for. Hiding one
      // never does, and neither does showing one back whose field is already in `rows`.
      const needsField = hasUnfetchedField(
        resolveFields(state.visibleColumns, columnsRef.current),
        fetchedFieldsRef.current
      )

      if (changed || needsField) {
        requestData(state)
      }

      onStateChangeRef.current?.(state)
    },
    [requestData]
  )

  /** Refetches whatever the table is showing now. */
  const refresh = React.useCallback(() => {
    if (stateRef.current) requestData(stateRef.current)
  }, [requestData])

  // The first `refreshToken` is the one it was mounted with, and the initial load is already
  // covered by the table reporting its opening state — acting on it would fetch page one twice.
  const isFirstTokenRef = React.useRef(true)

  React.useEffect(() => {
    if (isFirstTokenRef.current) {
      isFirstTokenRef.current = false
      return
    }

    refresh()
  }, [refreshToken, refresh])

  // Exposed imperatively so a plugin, or anything else outside this tree, can refresh the grid
  // after a mutation it ran itself.
  useRegisterTableScope(rest.id, "refresh", {
    getState: () => lastUpdate,
    actions: { refresh },
  })

  const searchableFields = useSearchableFields({
    enabled: Boolean(withSearch),
    domain: searchOptions?.domain,
    getSearchableFields,
  })

  const { refreshAction, interval, setInterval, intervals } = useRefresh({
    refresh,
    options: refreshOptions,
    loading,
    lastUpdate,
    storage: {
      storageKey: rest.storageKey ?? DATA_TABLE_STORAGE_KEY,
      tableId: rest.id,
      userId: rest.userId,
      persistState: rest.persistState,
    },
  })

  const autoRefresh = React.useMemo(
    () => ({ interval, intervals, setInterval }),
    [interval, intervals, setInterval]
  )

  const { exportAction, isExporting } = useExport<TRow>({
    enabled: withExport,
    options: exportOptions,
    stateRef,
    columnsRef,
    filtersRef,
  })

  // Refresh changes the view, Export produces something from it — so they go to opposite
  // clusters, and both through the same seams a consumer's own actions use. The table itself
  // stays unaware that either exists.
  const asyncRightActions = React.useMemo<DataTableActionEntry[]>(
    () => [refreshAction, ...(rightActions ?? [])],
    [refreshAction, rightActions]
  )

  const asyncHeaderActions = React.useMemo<DataTableActionEntry[]>(
    () =>
      exportAction
        ? [exportAction, ...(headerActions ?? [])]
        : (headerActions ?? []),
    [exportAction, headerActions]
  )

  // An `'all'` selection means "everything matching the filters", so a bulk action against a
  // server needs the filters the way the server reads them — the same payload `getData` gets.
  const asyncBulkActions = React.useMemo<
    AsyncDataTableBaseProps<TRow>["bulkActions"]
  >(
    () =>
      typeof bulkActions === "function"
        ? (context) =>
            bulkActions({
              ...context,
              serverFiltering: prepareServerFiltering(
                context.filtering,
                filters ?? []
              ),
            })
        : bulkActions,
    [bulkActions, filters]
  )

  const asyncSearchOptions = React.useMemo(
    () => ({
      ...searchOptions,
      // What the server loaded wins over anything declared: against a server, which fields
      // are searchable is the server's answer.
      searchableFields:
        searchableFields.length > 0
          ? searchableFields
          : searchOptions?.searchableFields,
    }),
    [searchOptions, searchableFields]
  )

  const lastUpdateValue = React.useMemo(
    () => (withLastUpdate ? { at: lastUpdate, interval } : null),
    [withLastUpdate, lastUpdate, interval]
  )

  const asyncSlots = React.useMemo(
    () => ({
      ...slots,
      // A caller's own footer still wins — this only fills the slot when nobody else has.
      footer:
        slots?.footer ?? (withLastUpdate ? AsyncDataTableFooter : undefined),
      // Auto-refresh in View options — again only when nobody else filled the slot.
      viewPanelSections: slots?.viewPanelSections ?? AsyncAutoRefreshSection,
    }),
    [slots, withLastUpdate]
  )

  return (
    <AsyncDataTableLastUpdateProvider value={lastUpdateValue}>
      <AsyncAutoRefreshProvider value={autoRefresh}>
        <DataTable<TRow>
          {...rest}
          manual
          columns={columns}
          filters={filters}
          withSearch={withSearch}
          searchOptions={asyncSearchOptions}
          rightActions={asyncRightActions}
          headerActions={asyncHeaderActions}
          bulkActions={asyncBulkActions}
          slots={asyncSlots}
          // An export reads the whole result set, which is the table's data — so the table
          // says it is busy, rather than the export spinning somewhere off to one side.
          loading={loading || isExporting}
          onStateChange={handleStateChange}
        />
      </AsyncAutoRefreshProvider>
    </AsyncDataTableLastUpdateProvider>
  )
}

/** Stable identity, so an omitted `plugins` never changes the composition's dependency. */
const NO_PLUGINS: DataTablePlugin<never>[] = []

/**
 * The plugin host.
 *
 * Composed with `reduceRight`, so the FIRST descriptor is the OUTERMOST wrapper — closest to the
 * caller's props, and therefore the one that gets to transform them before anything else sees them.
 */
function AsyncDataTable<TRow>({
  plugins = NO_PLUGINS as unknown as DataTablePlugin<TRow>[],
  ...props
}: AsyncDataTableProps<TRow>) {
  // Building a component out of data is what a plugin host IS: the composition cannot be known
  // before the descriptors are.
  //
  // `static-components` guards against a component type that changes identity every render and
  // remounts its whole subtree with it. That hazard is real here, and it is met rather than
  // waved away: `plugins` is documented as having to be a stable array, and the composition is
  // memoised on it, so the type is built once per plugin list.
  const Composed = React.useMemo(
    () =>
      // eslint-disable-next-line @eslint-react/static-components
      plugins.reduceRight<React.ComponentType<AsyncDataTableBaseProps<TRow>>>(
        (Wrapped, plugin) => plugin.enhance(Wrapped, plugin.props),
        AsyncDataTableBase
      ),
    [plugins]
  )

  // eslint-disable-next-line react-hooks/static-components, @eslint-react/static-components
  return <Composed {...props} />
}

export { AsyncDataTable, AsyncDataTableBase }
