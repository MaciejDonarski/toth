import * as React from "react"

import { useIsMobile } from "../../internal/hooks/use-is-mobile"
import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import type { ActionsEntry } from "../../internal/actions"
import { Button } from "../../internal/button"
import { useSizeStep } from "../../internal/hooks/use-size-step"
import { DataTableActiveFilters } from "../active-filters"
import { DataTableBulkBar } from "../bulk-bar"
import { DataTableFilterPanel } from "../filter-panel"
import type { PlainTableSize } from "../plain-table"
import { PlainTable } from "../plain-table"
import type {
  PlainTableColumn,
  PlainTableColumnMenuGroup,
  PlainTableHandle,
} from "../plain-table/types"
import type {
  DataTableRowAction,
  DataTableRowActionEntry,
} from "../row-actions"
import { DataTableRowActionsProvider } from "../row-actions"
import { DataTableSearch } from "../search"
import {
  DataTableSelectionCell,
  DataTableSelectionProvider,
  selectionHeaderLabel,
} from "../selection-cells"
import {
  DataTableSortLabel,
  DataTableSortProvider,
  sortHeaderCellProps,
} from "../sort-button"
import { DataTableFooter } from "../table-footer"
import { DataTableSheet } from "../table-sheet"
import { DataTableToolbar } from "../toolbar"
import { DataTableViewPanel } from "../view-panel"
import { useRegisterTableScope } from "../../hooks/use-register-table-scope"
import { applyClientFilters } from "../../lib/apply-filters"
import type { FilteringState, FilterValue } from "../../lib/filter-types"
import { getSearchValue, SEARCH_KEY } from "../../lib/search-filtering"
import { sortActionsByOrder } from "../../lib/sort-actions"
import { emitChange, getScope } from "../../lib/table-registry"
import type { DataTableState } from "../../lib/table-state"

import { columnMenuItems } from "./column-menu"
import { useDataTableConfig } from "./config-context"
import {
  COLUMNS_ACTION_ORDER,
  DATA_TABLE_SIZE_STEPS,
  DATA_TABLE_STORAGE_KEY,
  FILTERS_ACTION_ORDER,
  SELECTION_COLUMN_ID,
  SELECTION_COLUMN_WIDTH,
} from "./data-table.constants"
import type {
  DataTableActionEntry,
  DataTableBulkActionContext,
  DataTableColumn,
  DataTableProps,
  DataTableSheetKind,
} from "./data-table.types"
import {
  useActionsColumn,
  useColumnOrder,
  useColumnPinning,
  useColumnsVisibility,
  useFilter,
  usePagination,
  useSelection,
  useSort,
  useTableHeightFit,
  useTableScroll,
  useViewOptions,
} from "./hooks"

// `PlainTable` draws a table. This draws a table someone can USE: sort it, page it, narrow it,
// pick rows out of it, and decide which columns it has.
//
// The composition is deliberately thin. Every piece of state is a hook in `./hooks`, every piece of
// chrome is a component under `../`, and what lives here is the ORDER they go in — which is the one
// thing that cannot live anywhere else:
//
//     rows → filter → sort → paginate → the page on screen
//     columns → order → visibility → pinning → the columns on screen
//
// Both pipelines are one-way, and each stage only knows about the one before it.

// Module scope, so an omitted `rowActions` does not hand the row-menu context a new array per render.
const NO_ROW_ACTIONS: readonly DataTableRowActionEntry<unknown>[] = []

/**
 * The field filters of a filtering state as one comparable string — keys sorted, the search term
 * left out (it has a box of its own, and the filter form carries it across untouched).
 */
function fieldFilteringKey(filtering: FilteringState): string {
  return JSON.stringify(
    Object.keys(filtering)
      .filter((key) => key !== SEARCH_KEY)
      .sort()
      .map((key) => [key, filtering[key]])
  )
}

const DEFAULT_GET_ROW_ID = (row: unknown, index: number): React.Key => {
  const id = (row as { id?: React.Key } | null)?.id
  return id ?? index
}

/**
 * The checkbox column.
 *
 * A module-level constant, and it has to be: the cells read the selection from context precisely so
 * that this object never changes identity. Rebuilt per render it would rebuild the `<colgroup>` and
 * the sticky offsets, and — the one that costs — hand the `React.memo`'d row a new `columns` prop,
 * re-rendering every row of the table every time a single box was ticked.
 *
 * Its trailing twin, the row-menu column, cannot be a constant because its width depends on how many
 * actions are promoted out of the menu; `useActionsColumn` keeps the identity just as stable by
 * memoising on that width alone.
 */
const SELECTION_COLUMN: PlainTableColumn<never> = {
  id: SELECTION_COLUMN_ID,
  label: selectionHeaderLabel,
  template: DataTableSelectionCell,
  stickyLeft: true,
  isResizable: false,
  isAlignable: false,
  align: "center",
  minWidth: SELECTION_COLUMN_WIDTH,
  maxWidth: SELECTION_COLUMN_WIDTH,
  defaultWidth: SELECTION_COLUMN_WIDTH,
}

// ===================== styles =====================
//
// One card: the toolbar and chips, the rows and the footer share one edge and one shadow.
// `overflow: hidden` clips the scroll region and the footer to the rounded corners; menus and
// popovers are portalled out, so nothing that has to escape the card is cut.
//
// What changes `PlainTable`'s look goes through the custom properties it reads, never its classes:
// compact density, column dividers, and the selected / previewing row tints.
//
// Filling the viewport (`data-fit-height`) is decided here rather than in JavaScript: the only
// thing measured is how far down the page the table starts (`--data-table-offset-top`). The room
// left below the table (`--data-table-reserved`) and the floor on a short window
// (`--data-table-min-height`) are overridable custom properties. The cap is a `max-height` on the
// ROOT, so a table of three rows still ends under its last row, and flex divides it: the toolbar
// and chips take what they need, the scroll region what is left. `100dvh` so a phone's collapsing
// address bar does not hide the last row.
const ROOT_CLASS = cn(
  "group/data-table flex w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs",
  "data-[density=compact]:[--plain-table-cell-padding-inline:0.25rem] data-[density=compact]:[--plain-table-header-height:2rem] data-[density=compact]:[--plain-table-row-height:2rem]",
  "data-column-dividers:[--plain-table-column-divider:var(--color-border)] data-column-dividers:[--plain-table-header-divider:var(--color-border)] data-column-dividers:[--plain-table-resize-line:transparent]",
  "data-fit-height:max-h-[max(var(--data-table-min-height,20rem),calc(100dvh-var(--data-table-offset-top,0px)-var(--data-table-reserved,1rem)))]"
)

/**
 * The rows and the panels that open over them. While a panel is up the box keeps enough height
 * for it (`--data-table-sheet-min-height`, overridable), so a filtered-down table of two rows does
 * not leave the panel a sliver with its buttons cropped off.
 */
const BODY_CLASS =
  "relative flex min-h-0 flex-col group-data-fit-height/data-table:flex-[1_1_auto] data-sheet:min-h-[min(var(--data-table-sheet-min-height,24rem),calc(100dvh-15rem))]"

// The leading plain class is a stable hook for a consumer's own selector (and the tests); the rest
// is the look.
const ROW_SELECTED_CLASS =
  "data-table-row-selected [--plain-table-row-bg:color-mix(in_oklch,var(--color-primary)_8%,var(--color-background))] [--plain-table-row-hover-bg:color-mix(in_oklch,var(--color-primary)_14%,var(--color-background))] [&>td:first-child]:shadow-[inset_3px_0_0_var(--color-primary)]"

const ROW_PREVIEWING_CLASS =
  "data-table-row-previewing [--plain-table-row-bg:var(--color-muted)] [--plain-table-row-hover-bg:var(--color-muted)] [&>td:first-child]:shadow-[inset_3px_0_0_var(--color-foreground)]"

function DataTable<TRow>(props: DataTableProps<TRow>) {
  // Defaults, then whatever a `DataTableConfigProvider` above sets, then this call's own props.
  const config = useDataTableConfig<TRow>(props)

  const {
    id,
    columns,
    rows,
    getRowId = DEFAULT_GET_ROW_ID as (row: TRow, index: number) => React.Key,
    getRowLabel,
    loading = false,
    error,
    onRetry,
    manual = false,
    totalItems,
    persistState = false,
    sizeSteps = DATA_TABLE_SIZE_STEPS,
    userId,
    storageKey = DATA_TABLE_STORAGE_KEY,
    withSelection = false,
    withSearch = false,
    withPagination = true,
    itemsLabel,
    withColumnsVisibility = true,
    withColumnReorder = false,
    withColumnPinning = false,
    withAdjustHeight = false,
    sortOptions,
    paginationOptions,
    selectionOptions,
    searchOptions,
    filtersOptions,
    toolbarOptions,
    filters,
    rowActions,
    rowPreview,
    activeRowId,
    onActiveRowChange,
    rowActionsColumnWidth,
    bulkActions,
    headerActions,
    rightActions,
    sort,
    onSortChange,
    page,
    onPageChange,
    pageSize,
    onPageSizeChange,
    selectedIds,
    onSelectedIdsChange,
    filtering: controlledFiltering,
    onFilteringChange,
    onColumnVisibilityChange,
    onColumnOrderChange,
    onColumnPinningChange,
    onStateChange,
    density: defaultDensity = "default",
    columnDividers: defaultColumnDividers = false,
    onDensityChange,
    onColumnDividersChange,
    slots,
    plainTableProps,
    className,
    ref,
  } = config

  const storage = { tableId: id, storageKey, userId, persistState }

  const rootRef = React.useRef<HTMLDivElement>(null)

  // How wide the TABLE is, as a step — the chrome below reads it, and so does the stylesheet
  // through `data-size`. The window is a different question (`useIsMobile`) with different
  // answers: a full-screen panel is about the screen, a two-row toolbar is about the table.
  const size = useSizeStep<PlainTableSize>(rootRef, {
    sm: 0,
    md: sizeSteps.md,
    lg: sizeSteps.lg,
  })
  const plainTableRef = React.useRef<PlainTableHandle>(null)

  // ===================== rows =====================

  // Populated from an effect below, once pagination exists. See `useFilter` for why the page
  // reset has to reach backwards like this.
  const resetPageRef = React.useRef<(() => void) | null>(null)

  const filterList = React.useMemo(() => filters ?? [], [filters])

  const filtering = useFilter({
    ...storage,
    filters: filterList,
    resetPageRef,
    filtering: controlledFiltering,
    onFilteringChange,
  })

  // Pulled apart so the memos below depend on what they use, not on the hook's return object —
  // which is a new object on every render.
  const { filtering: filteringState, setFiltering, clearFilters } = filtering

  const searchableFields = React.useMemo(
    () => (searchOptions?.searchableFields ?? []).map((field) => field.field),
    [searchOptions?.searchableFields]
  )

  const filteredRows = React.useMemo(
    () =>
      manual
        ? rows
        : applyClientFilters(
            rows,
            filterList,
            filtering.filtering,
            searchableFields
          ),
    [manual, rows, filterList, filtering.filtering, searchableFields]
  )

  const sorting = useSort({
    ...storage,
    columns,
    rows: filteredRows,
    manual,
    sortOptions,
    sort,
    onSortChange,
  })

  const pagination = usePagination({
    ...storage,
    rows: sorting.sortedRows,
    manual,
    totalItems,
    paginationOptions,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
  })

  // Filtering runs before pagination exists, so the page reset is handed over here instead of
  // through props. An effect rather than a render-phase write: effects have long run by the time
  // a user can touch a filter, and the two updates still land in one commit because they happen
  // in the same event handler.
  const { resetPage } = pagination

  React.useEffect(() => {
    resetPageRef.current = resetPage
  }, [resetPage])

  const visibleRows = withPagination
    ? pagination.paginatedRows
    : sorting.sortedRows

  const selection = useSelection({
    allRows: sorting.sortedRows,
    visibleRows,
    getRowId,
    excludedIds: selectionOptions?.excludedIds,
    manual,
    selectAllMatching: selectionOptions?.selectAllMatching,
    totalItems: pagination.pagination.totalItems,
    selectedIds,
    onSelectedIdsChange,
  })

  // ===================== columns =====================

  // Ordering comes first and runs over EVERY column, hidden ones included: a saved order that
  // only covered what was visible would shuffle itself every time a column was hidden.
  const columnOrder = useColumnOrder({
    ...storage,
    columns,
    onColumnOrderChange,
  })

  const visibility = useColumnsVisibility({
    ...storage,
    columns: columnOrder.orderedColumns,
    onColumnVisibilityChange,
  })

  const pinning = useColumnPinning({
    ...storage,
    columns: visibility.visibleColumns,
    onColumnPinningChange,
  })

  const view = useViewOptions({
    ...storage,
    density: defaultDensity,
    columnDividers: defaultColumnDividers,
    onDensityChange,
    onColumnDividersChange,
  })
  const { density, columnDividers } = view

  // Back to how the table started: the declared visibility, order and pinning, the default
  // density and dividers, and — through the registry, where `PlainTable` publishes them — the
  // default widths and alignments.
  const resetView = React.useCallback(() => {
    visibility.setHidden(
      columns.filter((column) => column.isHidden).map((column) => column.id)
    )
    columnOrder.setOrder(columns.map((column) => column.id))
    pinning.reset()
    view.reset()

    if (id) {
      getScope(id, "columnWidth")?.actions.resetAll?.()
      getScope(id, "columnAlign")?.actions.resetAll?.()
    }
  }, [visibility, columns, columnOrder, pinning, view, id])

  // ===================== panels over the rows =====================

  const isMobile = useIsMobile()
  const messages = useTableMessages()

  // The quick view's row, by id — controlled through `activeRowId`, or held here.
  const [ownPreviewId, setOwnPreviewId] = React.useState<React.Key | null>(null)
  const previewId = activeRowId !== undefined ? activeRowId : ownPreviewId
  const setPreviewId = React.useCallback(
    (next: React.Key | null) => {
      if (activeRowId === undefined) setOwnPreviewId(next)
      onActiveRowChange?.(next)
    },
    [activeRowId, onActiveRowChange]
  )

  // The rows on this page by id, both ways — what the quick view steps through.
  const pageIds = React.useMemo(
    () => visibleRows.map((row, index) => getRowId(row, index)),
    [visibleRows, getRowId]
  )
  const previewIndex = previewId === null ? -1 : pageIds.indexOf(previewId)
  // A row that has left the page (a refetch, a page turn) closes its quick view with it.
  const previewRow =
    rowPreview && previewIndex >= 0 ? visibleRows[previewIndex] : undefined

  // Which panel is up over the rows. The quick view is open whenever it has a row; `filtersOpen`
  // covers the other. Opening either closes the other — two panels stacked over the same rows
  // would hide the very rows the second was opened to look at.
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const openSheet: DataTableSheetKind | null =
    previewRow !== undefined ? "preview" : filtersOpen ? "filters" : null

  const toggleSheet = React.useCallback(
    (kind: DataTableSheetKind) => {
      if (kind !== "filters") return
      if (previewId !== null) setPreviewId(null)
      setFiltersOpen((open) => !open)
    },
    [previewId, setPreviewId]
  )
  const closeSheet = React.useCallback(() => setFiltersOpen(false), [])

  const openPreview = React.useCallback(
    (rowId: React.Key) => {
      setFiltersOpen(false)
      // The eye of the row already in view closes it, like any toggle.
      setPreviewId(previewId === rowId ? null : rowId)
    },
    [previewId, setPreviewId]
  )
  const closePreview = React.useCallback(
    () => setPreviewId(null),
    [setPreviewId]
  )

  // The controls that open a panel over these rows — the Filters button and each row's eye. A
  // press on one is left to it rather than counted as a press outside an open panel: it toggles
  // or switches the panel itself. This table's own only, so another table's Filters button
  // still closes this one's panel.
  const isSheetTrigger = React.useCallback(
    (target: Element) =>
      rootRef.current?.contains(target) === true &&
      target.closest(
        '[data-slot="filters-trigger"], [data-preview-trigger]'
      ) !== null,
    []
  )

  // The table body the panels open over — state rather than a ref, because a sheet has to be
  // rendered again once there is an element to portal into.
  const [bodyElement, setBodyElement] = React.useState<HTMLDivElement | null>(
    null
  )
  const previewSheetId = React.useId()

  const stepPreview = React.useCallback(
    (step: -1 | 1) => {
      const next = pageIds[previewIndex + step]
      if (previewIndex >= 0 && next !== undefined) setPreviewId(next)
    },
    [pageIds, previewIndex, setPreviewId]
  )
  const previewContext = React.useMemo(
    () => ({
      close: () => setPreviewId(null),
      next: () => stepPreview(1),
      prev: () => stepPreview(-1),
      index: previewIndex,
      count: pageIds.length,
    }),
    [setPreviewId, stepPreview, previewIndex, pageIds.length]
  )
  // Escape gives focus back to the eye of the row that was in view — the one the user reached
  // for, wherever the arrows have moved the panel since.
  const previewTrigger = React.useCallback(
    () =>
      rootRef.current?.querySelector<HTMLElement>(
        `[data-preview-trigger="${CSS.escape(String(previewId))}"]`
      ),
    [previewId]
  )

  // The quick view's own controls, ahead of whatever the caller declared: an eye button in the
  // row, and "Quick view" at the top of the row menu. Rebuilt when the previewed row changes, so
  // the eye can say which one is open — a rare event, unlike a keystroke or a resize.
  const resolvedRowActions = React.useMemo(() => {
    if (!rowPreview) return rowActions

    const idOf = (row: TRow) =>
      pageIds[visibleRows.indexOf(row)] ?? getRowId(row, -1)
    const eye: DataTableRowAction<TRow> = {
      key: "quick-view",
      label: messages.preview.trigger,
      icon: "eye",
      title: messages.preview.trigger,
      standalone: true,
      render: (row) => {
        const rowId = idOf(row)
        const open = rowId === previewId

        return (
          <button
            type="button"
            data-preview-trigger={String(rowId)}
            aria-expanded={open}
            aria-controls={open ? previewSheetId : undefined}
            // The eye of the row in view stays lit while its panel is up.
            className="aria-expanded:bg-primary/10 aria-expanded:text-primary"
          />
        )
      },
      onClick: (row) => openPreview(idOf(row)),
    }

    if (!rowActions || rowActions.length === 0) return [eye]

    const menuRow: DataTableRowAction<TRow> = {
      key: "quick-view-menu",
      label: messages.preview.trigger,
      icon: "eye",
      onClick: (row) => openPreview(idOf(row)),
    }

    return [eye, [menuRow], ...rowActions]
  }, [
    rowPreview,
    rowActions,
    pageIds,
    visibleRows,
    getRowId,
    previewId,
    previewSheetId,
    openPreview,
    messages,
  ])

  // `null` when the declared actions can never draw anything — the column is not merely narrow
  // then, it is absent.
  const actionsColumn = useActionsColumn(
    resolvedRowActions,
    rowActionsColumnWidth
  )

  // The table's own columns wrap the caller's: the checkbox on the leading edge, the row menu on
  // the trailing one, both pinned there so neither scrolls away from the row it belongs to.
  const renderedColumns = React.useMemo(() => {
    const result: DataTableColumn<TRow>[] = [...pinning.pinnedColumns]

    if (withSelection) {
      result.unshift(SELECTION_COLUMN as DataTableColumn<TRow>)
    }

    if (actionsColumn) {
      result.push(actionsColumn as DataTableColumn<TRow>)
    }

    return result
  }, [pinning.pinnedColumns, withSelection, actionsColumn])

  // ===================== toolbar =====================

  const showFilters = filterList.length > 0
  const filtersInSheet = filtersOptions?.container !== "popover"
  const filterSheetId = React.useId()
  const filtersTrigger = React.useCallback(
    () =>
      rootRef.current?.querySelector<HTMLElement>(
        '[data-slot="filters-trigger"]'
      ),
    []
  )

  // The form in the filter sheet is seeded once, when it mounts, and from then on it is the one
  // being edited. A change that did NOT come from it — a chip removed, Reset filters — would
  // leave it showing values no longer in force, and its next apply would put them back. So such
  // a change remounts it from the current filtering; its own applies do not, or every keystroke
  // would cost the field its focus. Adjusted during render rather than in an effect, so the stale
  // form is never painted.
  const filteringKey = fieldFilteringKey(filteringState)
  const [appliedByPanel, setAppliedByPanel] = React.useState<string | null>(
    null
  )
  const [filterPanel, setFilterPanel] = React.useState({
    seen: filteringKey,
    key: 0,
  })

  if (filterPanel.seen !== filteringKey) {
    setFilterPanel({
      seen: filteringKey,
      key:
        filteringKey === appliedByPanel ? filterPanel.key : filterPanel.key + 1,
    })
  }

  const ViewPanelSections = slots?.viewPanelSections

  // Field filters only: the search term shares the map but has a box of its own.
  const activeFilterCount = filterList.filter(
    (filter) => filteringState[filter.field] !== undefined
  ).length

  const toolbarRightActions = React.useMemo(() => {
    const entries: DataTableActionEntry[] = [...(rightActions ?? [])]

    // DECISION: View options replaces Columns under the same switch, `withColumnsVisibility`;
    // a table that turned Columns off does not gain a new button.
    if (withColumnsVisibility) {
      entries.push({
        key: "view-options",
        label: messages.view.trigger,
        icon: "sliders-horizontal",
        title: messages.view.trigger,
        variant: "ghost",
        size: "icon",
        order: COLUMNS_ACTION_ORDER,
        // Always a button — the toolbar keeps it on a phone too — and there the panel
        // opens as a full sheet rather than as a popover with nowhere near enough room.
        standalone: true,
        asSheetOnMobile: true,
        sheetProps: {
          side: "bottom",
          title: messages.view.title,
          // On a phone: the whole screen, sliding up, like the filters and the quick view.
          className: "top-0 h-dvh overflow-y-auto",
        },
        panelProps: { align: "start", className: "w-auto p-0" },
        panel: (
          <DataTableViewPanel
            density={density}
            onDensityChange={view.setDensity}
            columnDividers={columnDividers}
            onColumnDividersChange={view.setColumnDividers}
            sections={ViewPanelSections ? <ViewPanelSections /> : null}
            columns={visibility.columnsWithVisibility}
            onToggleColumn={visibility.toggleColumn}
            withReorder={withColumnReorder}
            onReorder={columnOrder.setOrder}
            getPinSide={withColumnPinning ? pinning.getPinSide : undefined}
            onReset={resetView}
          />
        ),
      })
    }

    if (showFilters) {
      // The count of filters in force rides on the button, so a narrowed table says so
      // before anyone looks at the chips.
      const label =
        activeFilterCount > 0 ? (
          <>
            {messages.filters.trigger}
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary tabular-nums"
              aria-label={messages.filters.activeCount(activeFilterCount)}
            >
              {activeFilterCount}
            </span>
          </>
        ) : (
          messages.filters.trigger
        )

      if (filtersInSheet) {
        // A command, not a panel: the sheet it opens lives in the table body, beside the
        // quick view, and only one of the two is up at a time.
        entries.push({
          key: "filters",
          label,
          icon: "filter",
          order: FILTERS_ACTION_ORDER,
          standalone: true,
          render: (
            <button
              type="button"
              data-slot="filters-trigger"
              aria-expanded={openSheet === "filters"}
              aria-controls={
                openSheet === "filters" ? filterSheetId : undefined
              }
            />
          ),
          onClick: () => toggleSheet("filters"),
        })
      } else {
        entries.push({
          key: "filters",
          label,
          sheetProps: { title: messages.filters.title },
          icon: "filter",
          order: FILTERS_ACTION_ORDER,
          standalone: "desktop",
          asSheetOnMobile: true,
          // An explicit width rather than one measured from the content: the room a
          // two-month date-range calendar and a side-by-side number range actually want.
          panelProps: { className: "w-[min(92vw,22rem)]" },
          panel: ({ close }) => (
            <DataTableFilterPanel
              filters={filterList}
              filtering={filteringState}
              submitOnChange={filtersOptions?.submitOnChange}
              debounce={filtersOptions?.debounce}
              onApply={(next) => {
                setFiltering(next)

                // Only a deliberate Apply dismisses the panel. With submit-on-change
                // the panel closing under the user after one keystroke would be a
                // bug, not a convenience.
                if (filtersOptions?.submitOnChange === false) close()
              }}
              onReset={clearFilters}
            />
          ),
        })
      }
    }

    return sortActionsByOrder(entries) as ActionsEntry[]
  }, [
    rightActions,
    withColumnsVisibility,
    withColumnReorder,
    withColumnPinning,
    visibility.columnsWithVisibility,
    visibility.toggleColumn,
    columnOrder.setOrder,
    pinning.getPinSide,
    density,
    columnDividers,
    view.setDensity,
    view.setColumnDividers,
    ViewPanelSections,
    resetView,
    showFilters,
    filtersInSheet,
    openSheet,
    filterSheetId,
    toggleSheet,
    activeFilterCount,
    filterList,
    filteringState,
    setFiltering,
    clearFilters,
    filtersOptions,
    messages,
  ])

  const toolbarActions = React.useMemo(
    () => sortActionsByOrder([...(headerActions ?? [])]) as ActionsEntry[],
    [headerActions]
  )

  // ===================== published state =====================

  const state = React.useMemo<DataTableState<TRow>>(
    () => ({
      sort: sorting.sort,
      filtering: filtering.filtering,
      pagination: pagination.pagination,
      selectedIds: selection.selection.selectedIds,
      selectedRows: selection.selection.selectedRows,
      selectionMode: selection.selection.mode,
      selectionExcludedIds: selection.selection.excludedIds,
      hiddenColumns: visibility.hiddenColumnIds,
      visibleColumns: visibility.visibleColumnIds,
    }),
    [
      sorting.sort,
      filtering.filtering,
      pagination.pagination,
      selection.selection,
      visibility.hiddenColumnIds,
      visibility.visibleColumnIds,
    ]
  )

  // One notification per change, after the commit that caused it — so a consumer reading the DOM
  // in response sees the table it is being told about.
  React.useEffect(() => {
    onStateChange?.(state)

    if (id) emitChange(id)
  }, [state, onStateChange, id])

  // ===================== the imperative surface =====================

  useRegisterTableScope(id, "sort", {
    getState: () => sorting.sort,
    actions: { setSort: sorting.setSort, reset: sorting.reset },
  })

  useRegisterTableScope(id, "pagination", {
    getState: () => pagination.pagination,
    actions: {
      setPage: pagination.goToPage,
      setPageSize: pagination.setPageSize,
    },
  })

  useRegisterTableScope(id, "selection", {
    getState: () => selection.selection,
    actions: {
      setSelectedIds: selection.setSelectedIds,
      selectAll: selection.selectAll,
      deselectAll: selection.deselectAll,
      selectPage: selection.selectPage,
      deselectPage: selection.deselectPage,
      toggleRow: selection.toggleRow,
    },
  })

  useRegisterTableScope(id, "columnVisibility", {
    getState: () => ({ hiddenIds: visibility.hiddenColumnIds }),
    actions: {
      setHidden: visibility.setHidden,
      toggleColumn: visibility.toggleColumn,
    },
  })

  useRegisterTableScope(id, "columnOrder", {
    getState: () => ({ order: columnOrder.order }),
    actions: { setOrder: columnOrder.setOrder },
  })

  useRegisterTableScope(id, "columnPinning", {
    getState: () => pinning.pinning,
    actions: { setPinning: pinning.setPinning, setPin: pinning.setPin },
  })

  useRegisterTableScope(id, "filtering", {
    getState: () => filtering.filtering,
    actions: {
      setFiltering: filtering.setFiltering,
      setSearch: filtering.setSearch,
      clearFilter: filtering.clearFilter,
      clearFilters: filtering.clearFilters,
      clearAll: filtering.clearAll,
    },
  })

  // ===================== chrome =====================

  useTableScroll({ ...storage, handleRef: plainTableRef, loading })
  const offsetTop = useTableHeightFit(rootRef, withAdjustHeight)

  React.useImperativeHandle(
    ref,
    () => ({ plainTable: plainTableRef.current }),
    []
  )

  const Toolbar = slots?.toolbar ?? DataTableToolbar
  const BulkBar = slots?.bulkBar ?? DataTableBulkBar

  // What the bulk actions are handed — and, with it, whether there are any to draw a bar for.
  const bulkContext = React.useMemo<DataTableBulkActionContext<TRow>>(
    () => ({
      selectedIds: selection.selection.selectedIds,
      selectedRows: selection.selection.selectedRows,
      mode: selection.selection.mode ?? "ids",
      excludedIds: selection.selection.excludedIds ?? [],
      count: selection.selectedCount,
      filtering: filtering.filtering,
    }),
    [selection.selection, selection.selectedCount, filtering.filtering]
  )

  const resolvedBulkActions = React.useMemo(
    () =>
      sortActionsByOrder(
        typeof bulkActions === "function"
          ? bulkActions(bulkContext)
          : [...(bulkActions ?? [])]
      ) as DataTableActionEntry[],
    [bulkActions, bulkContext]
  )

  // The header chevron's four choices, for the bar docked at the foot of a phone screen — the
  // header is scrolled away by the time anyone reaches for them there.
  const selectionChoices = React.useMemo<DataTableActionEntry[]>(
    () => [
      {
        key: "select-page",
        label: messages.selection.selectCurrentPage,
        icon: "check",
        disabled: selection.isPageSelected,
        onClick: selection.selectPage,
      },
      ...(selection.canSelectAll
        ? [
            {
              key: "select-all",
              label: messages.selection.selectAllCount(
                pagination.pagination.totalItems
              ),
              icon: "list-todo" as const,
              disabled: selection.isAllSelected,
              onClick: selection.selectAll,
            },
          ]
        : []),
      {
        key: "deselect-page",
        label: messages.selection.deselectCurrentPage,
        icon: "x",
        disabled:
          !selection.isPageSelected && !selection.isPagePartiallySelected,
        onClick: selection.deselectPage,
      },
      {
        key: "deselect-all",
        label: messages.selection.deselectAll,
        icon: "x",
        disabled: selection.selectedCount === 0,
        onClick: selection.deselectAll,
      },
    ],
    [selection, pagination.pagination.totalItems, messages]
  )

  // DECISION: the bulk bar appears only with `bulkActions` (or `slots.bulkBar`), so existing
  // tables with a selection keep their toolbar during it.
  // The bar takes the toolbar's place only for a table that declared what to do with a selection
  // (or replaced the bar outright); without that the toolbar — search and all — stays, as before.
  const showBulkBar =
    withSelection &&
    selection.selectedCount > 0 &&
    (bulkActions !== undefined || slots?.bulkBar !== undefined)
  const Footer = slots?.footer ?? DataTableFooter
  const ActiveFilters = slots?.activeFilters ?? DataTableActiveFilters

  const search = withSearch ? (
    <DataTableSearch
      value={getSearchValue(filtering.filtering)}
      onChange={filtering.setSearch}
      submitOnChange={searchOptions?.submitOnChange}
      debounce={searchOptions?.debounce}
      searchableFields={searchOptions?.searchableFields}
      placeholder={searchOptions?.placeholder}
      fullWidth
    />
  ) : null

  // ===================== context =====================
  //
  // Every value below keeps its identity for as long as what it carries does. A context value
  // rebuilt on every render re-renders every consumer on every render — which for the row
  // checkboxes and the row menus is every row of the table, `React.memo` on the row or not.

  const sortContext = React.useMemo(
    () => ({
      getSortDirection: sorting.getSortDirection,
      onSort: sorting.onSort,
    }),
    [sorting.getSortDirection, sorting.onSort]
  )

  // The row checkboxes read the selection from the store, one row each, and act on it through a
  // handler that reads the latest `toggleRow` from a ref — so this value does not change when the
  // selection does, and a tick re-renders only the checkbox that flipped.
  const toggleRowRef = React.useRef(selection.toggleRow)

  React.useLayoutEffect(() => {
    toggleRowRef.current = selection.toggleRow
  }, [selection.toggleRow])

  const toggleRow = React.useCallback(
    (rowId: React.Key) => toggleRowRef.current(rowId),
    []
  )

  const selectionRowContext = React.useMemo(
    () => ({
      rowId: getRowId as (row: unknown, index: number) => React.Key,
      getRowLabel: getRowLabel as ((row: unknown) => string) | undefined,
      store: selection.store,
      isRowSelectable: selection.isRowSelectable,
      toggleRow,
    }),
    [
      getRowId,
      getRowLabel,
      selection.store,
      selection.isRowSelectable,
      toggleRow,
    ]
  )

  const selectionHeaderContext = React.useMemo(
    () => ({
      selectedCount: selection.selectedCount,
      totalCount: pagination.pagination.totalItems,
      canSelectAll: selection.canSelectAll,
      isAllSelected: selection.isAllSelected,
      isPageSelected: selection.isPageSelected,
      isPagePartiallySelected: selection.isPagePartiallySelected,
      selectAll: selection.selectAll,
      deselectAll: selection.deselectAll,
      selectPage: selection.selectPage,
      deselectPage: selection.deselectPage,
    }),
    [
      selection.selectedCount,
      pagination.pagination.totalItems,
      selection.canSelectAll,
      selection.isAllSelected,
      selection.isPageSelected,
      selection.isPagePartiallySelected,
      selection.selectAll,
      selection.deselectAll,
      selection.selectPage,
      selection.deselectPage,
    ]
  )

  const rowActionsContext = React.useMemo(
    () => ({
      actions: (resolvedRowActions ??
        NO_ROW_ACTIONS) as readonly DataTableRowActionEntry<unknown>[],
    }),
    [resolvedRowActions]
  )

  // ===================== what PlainTable is handed =====================

  const { isRowSelected } = selection
  const callerRowClassName = plainTableProps?.getRowClassName

  const getRowClassName = React.useCallback(
    (row: TRow, rowIndex: number) =>
      cn(
        // Through the custom properties `PlainTable` reads for a cell's background, plus a rail
        // down the leading edge: the selection is visible at a glance down a long column.
        withSelection && isRowSelected(getRowId(row, rowIndex))
          ? ROW_SELECTED_CLASS
          : undefined,
        // The row in the quick view: a grey tint and a primary rail — set apart from a selected
        // row's tint, since a row can be both.
        previewRow !== undefined && row === previewRow
          ? ROW_PREVIEWING_CLASS
          : undefined,
        callerRowClassName?.(row, rowIndex)
      ),
    [withSelection, isRowSelected, getRowId, previewRow, callerRowClassName]
  )

  const isRowSelectedForRow = React.useCallback(
    (row: TRow, rowIndex: number) => isRowSelected(getRowId(row, rowIndex)),
    [isRowSelected, getRowId]
  )

  const plainTableSlots = React.useMemo(
    () => ({ headerCellLabel: DataTableSortLabel, ...slots?.plainTable }),
    [slots?.plainTable]
  )

  const callerSlotProps = plainTableProps?.slotProps

  const isFiltered =
    activeFilterCount > 0 || getSearchValue(filteringState) !== ""
  const clearAllFilters = filtering.clearAll

  const callerColumnMenu = callerSlotProps?.header?.getColumnMenuItems

  // Sort, Pin and Hide around `PlainTable`'s own Align section. A caller's own builder still runs,
  // last, and receives this table's menu as its defaults — so it can add to it or replace it.
  const getColumnMenuItems = React.useMemo(() => {
    const ours = columnMenuItems<TRow>({
      getSortDirection: sorting.getSortDirection,
      setSort: sorting.setSort,
      withPinning: withColumnPinning,
      getPinSide: pinning.getPinSide,
      setPin: pinning.setPin,
      withHiding: withColumnsVisibility,
      toggleColumn: visibility.toggleColumn,
      messages,
    })

    return callerColumnMenu
      ? (
          column: PlainTableColumn<TRow>,
          defaults: PlainTableColumnMenuGroup[]
        ) => callerColumnMenu(column, ours(column, defaults))
      : ours
  }, [
    sorting.getSortDirection,
    sorting.setSort,
    withColumnPinning,
    pinning.getPinSide,
    pinning.setPin,
    withColumnsVisibility,
    visibility.toggleColumn,
    messages,
    callerColumnMenu,
  ])

  const plainTableSlotProps = React.useMemo(
    () => ({
      ...callerSlotProps,
      header: {
        ...callerSlotProps?.header,
        // `aria-sort` belongs on the `<th>`, which no slot inside the cell can reach.
        getHeaderCellProps: sortHeaderCellProps<TRow>(sorting.getSortDirection),
        getColumnMenuItems,
      },
      // Which nothing it is: narrowed to no rows (with a way out) or no rows at all. The
      // search term counts — it narrows the rows like any filter.
      noData: {
        hasFilters: isFiltered,
        onClearFilters: clearAllFilters,
        ...callerSlotProps?.noData,
      },
      error: { hasFilters: isFiltered, ...callerSlotProps?.error },
    }),
    [
      callerSlotProps,
      sorting.getSortDirection,
      getColumnMenuItems,
      isFiltered,
      clearAllFilters,
    ]
  )

  const setFilter = React.useCallback(
    (field: string, value: FilterValue | undefined) =>
      setFiltering(
        value === undefined
          ? filteringState
          : { ...filteringState, [field]: value }
      ),
    [setFiltering, filteringState]
  )

  return (
    <DataTableSortProvider value={sortContext}>
      <DataTableSelectionProvider
        row={selectionRowContext}
        header={selectionHeaderContext}
      >
        <DataTableRowActionsProvider value={rowActionsContext}>
          <div
            ref={rootRef}
            data-slot="data-table"
            data-fit-height={withAdjustHeight || undefined}
            data-size={size}
            data-column-dividers={columnDividers || undefined}
            data-density={density}
            className={cn(ROOT_CLASS, className)}
            // The measurement JavaScript contributes to filling the viewport. The
            // height itself is worked out in CSS — see `data-table.module.scss`.
            style={
              withAdjustHeight
                ? ({
                    "--data-table-offset-top": `${offsetTop}px`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <div
              data-slot="data-table-header"
              // Ruled off from the rows; gone entirely when both parts render nothing.
              className="flex flex-col border-b empty:hidden"
            >
              {showBulkBar && !isMobile ? (
                <BulkBar
                  selectedCount={selection.selectedCount}
                  totalCount={pagination.pagination.totalItems}
                  canSelectAll={selection.canSelectAll}
                  isAllSelected={selection.isAllSelected}
                  onSelectAll={selection.selectAll}
                  onClear={selection.deselectAll}
                  actions={resolvedBulkActions}
                />
              ) : (
                <Toolbar
                  actions={toolbarActions}
                  rightActions={toolbarRightActions}
                  search={search}
                  maxVisibleActions={toolbarOptions?.maxVisibleActions}
                  size={size}
                />
              )}
              <ActiveFilters
                filters={filterList}
                filtering={filtering.filtering}
                onClearFilter={filtering.clearFilter}
                onSetFilter={setFilter}
                onClearAll={filtering.clearAll}
                size={size}
              />
            </div>
            <div
              ref={setBodyElement}
              data-slot="data-table-body"
              data-sheet={openSheet ?? undefined}
              // Positioned: the panels are portalled in here and placed against this box.
              className={BODY_CLASS}
            >
              <PlainTable
                {...plainTableProps}
                ref={plainTableRef}
                id={id}
                userId={userId}
                persistState={persistState}
                columns={renderedColumns}
                rows={visibleRows}
                getRowId={getRowId}
                loading={loading}
                error={error}
                onRetry={onRetry}
                wrapperClassName={cn(
                  "min-w-0 group-data-fit-height/data-table:min-h-0 group-data-fit-height/data-table:flex-[1_1_auto]",
                  plainTableProps?.wrapperClassName
                )}
                getRowClassName={getRowClassName}
                isRowSelected={withSelection ? isRowSelectedForRow : undefined}
                slots={plainTableSlots}
                slotProps={plainTableSlotProps}
                sizeSteps={sizeSteps}
              />

              {showFilters && filtersInSheet ? (
                <DataTableSheet
                  id={filterSheetId}
                  open={openSheet === "filters"}
                  onClose={closeSheet}
                  container={bodyElement}
                  isMobile={isMobile}
                  title={messages.filters.title}
                  subtitle={[
                    activeFilterCount > 0
                      ? messages.filters.activeCount(activeFilterCount)
                      : null,
                    filtersOptions?.submitOnChange === false
                      ? null
                      : messages.filters.appliedAsYouEdit,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  closeLabel={messages.filters.close}
                  returnFocus={filtersTrigger}
                  isTrigger={isSheetTrigger}
                  footer={
                    <>
                      <Button variant="link" size="sm" onClick={clearFilters}>
                        {messages.filters.resetFilters}
                      </Button>
                      <span className="flex-1" />
                      {isMobile ? (
                        // On a phone the panel covers the rows, so its way out
                        // says what is waiting underneath.
                        <Button className="flex-[1_1_0]" onClick={closeSheet}>
                          {loading
                            ? messages.filters.updating
                            : messages.filters.showResults(
                                pagination.pagination.totalItems,
                                itemsLabel
                              )}
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={closeSheet}>
                          {messages.filters.done}
                        </Button>
                      )}
                    </>
                  }
                >
                  <DataTableFilterPanel
                    key={filterPanel.key}
                    filters={filterList}
                    filtering={filteringState}
                    submitOnChange={filtersOptions?.submitOnChange}
                    debounce={filtersOptions?.debounce}
                    withActions={filtersOptions?.submitOnChange === false}
                    onApply={(next) => {
                      // Recorded with the change itself, so the render it causes
                      // knows this one came from the form and leaves it alone.
                      setAppliedByPanel(fieldFilteringKey(next))
                      setFiltering(next)
                    }}
                    onReset={clearFilters}
                  />
                </DataTableSheet>
              ) : null}

              {rowPreview ? (
                <DataTableSheet
                  id={previewSheetId}
                  open={previewRow !== undefined}
                  onClose={closePreview}
                  container={bodyElement}
                  isMobile={isMobile}
                  wide
                  title={
                    previewRow !== undefined
                      ? (rowPreview.title?.(previewRow) ??
                        messages.preview.title)
                      : messages.preview.title
                  }
                  subtitle={
                    previewRow !== undefined
                      ? rowPreview.subtitle?.(previewRow)
                      : undefined
                  }
                  closeLabel={messages.preview.close}
                  returnFocus={previewTrigger}
                  isTrigger={isSheetTrigger}
                  headerActions={
                    isMobile ? null : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          icon="chevron-up"
                          aria-label={messages.preview.previous}
                          title={messages.preview.previous}
                          disabled={previewIndex <= 0}
                          onClick={previewContext.prev}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          icon="chevron-down"
                          aria-label={messages.preview.next}
                          title={messages.preview.next}
                          disabled={previewIndex >= pageIds.length - 1}
                          onClick={previewContext.next}
                        />
                      </>
                    )
                  }
                  footer={
                    previewRow !== undefined &&
                    (isMobile || rowPreview.footer) ? (
                      <>
                        {isMobile ? (
                          // On a phone the stepping is at the thumb,
                          // with where the row stands between the two.
                          <div className="flex flex-[1_1_100%] items-center justify-between">
                            <Button
                              variant="ghost"
                              icon="chevron-left"
                              disabled={previewIndex <= 0}
                              onClick={previewContext.prev}
                            >
                              {messages.preview.previousLabel}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {messages.preview.position(
                                previewIndex + 1,
                                pageIds.length
                              )}
                            </span>
                            <Button
                              variant="ghost"
                              rightIcon="chevron-right"
                              disabled={previewIndex >= pageIds.length - 1}
                              onClick={previewContext.next}
                            >
                              {messages.preview.nextLabel}
                            </Button>
                          </div>
                        ) : null}
                        {rowPreview.footer?.(previewRow, previewContext)}
                      </>
                    ) : null
                  }
                >
                  {previewRow !== undefined
                    ? rowPreview.render(previewRow, previewContext)
                    : null}
                </DataTableSheet>
              ) : null}
            </div>

            {showBulkBar && isMobile ? (
              <BulkBar
                selectedCount={selection.selectedCount}
                totalCount={pagination.pagination.totalItems}
                canSelectAll={selection.canSelectAll}
                isAllSelected={selection.isAllSelected}
                onSelectAll={selection.selectAll}
                onClear={selection.deselectAll}
                actions={resolvedBulkActions}
                docked
                selectionChoices={selectionChoices}
              />
            ) : null}

            {withPagination ? (
              <Footer
                pagination={pagination.pagination}
                sizes={pagination.sizes}
                selectedCount={selection.selectedCount}
                itemsLabel={itemsLabel}
                size={size}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.setPageSize}
              />
            ) : null}
          </div>
        </DataTableRowActionsProvider>
      </DataTableSelectionProvider>
    </DataTableSortProvider>
  )
}

export { DataTable }
