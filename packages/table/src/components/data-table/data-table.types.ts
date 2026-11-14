import type * as React from "react"

import type { Action } from "../../internal/actions"
import type { DataTableActiveFiltersProps } from "../active-filters"
import type { DataTableBulkBarProps } from "../bulk-bar"
import type { PlainTableProps } from "../plain-table"
import type {
  PlainTableColumn,
  PlainTableHandle,
  PlainTableRowData,
  PlainTableSlots,
} from "../plain-table/types"
import type { DataTableRowActionEntry } from "../row-actions"
import type { DataTableFooterProps } from "../table-footer"
import type { DataTableToolbarProps } from "../toolbar"
import type { DataTableFilter, FilteringState } from "../../lib/filter-types"
import type { Orderable } from "../../lib/sort-actions"
import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnVisibilityState,
  DataTableState,
  SelectionMode,
  SortDirection,
  SortState,
} from "../../lib/table-state"

// The column contract, and the option bags the feature props take. The state shapes live in
// `lib/table-state` because the registry publishes them; these are the caller's side.

/**
 * A column of a composed table: everything `PlainTable` understands about drawing one, plus what
 * the layer above needs to sort it, hide it and ask the server for it.
 */
export interface DataTableColumn<
  TRow = PlainTableRowData,
> extends PlainTableColumn<TRow> {
  /**
   * The server field behind this column, when it differs from `id`.
   *
   * `id` is the table's own identity for the column — the key it persists state under and reads
   * the cell value with. `field` is what goes out in the request. Keeping them separate is what
   * lets a column be renamed on the backend without invalidating everyone's saved layout.
   */
  field?: string
  /** Draw a sort control in the header. */
  isSortable?: boolean
  /** The direction this column is sorted in when the table first opens and nothing is persisted. */
  sortDir?: Exclude<SortDirection, "">
  /** Start hidden. Only consulted while the user has no column visibility of their own. */
  isHidden?: boolean
  /** The field name to sort by, when the server sorts on something other than `field`. */
  sortField?: string
  /**
   * The field paths an export should ask for on this column's behalf, when one column is built
   * from several — a name cell drawing `firstName` and `lastName`, say.
   */
  exportFields?: string[]
}

export interface DataTableSortOptions {
  /** The column and direction to open with, when nothing is persisted and no column says. */
  defaultSort?: { columnId: string; direction: Exclude<SortDirection, ""> }
}

export interface DataTablePaginationOptions {
  /** Rows per page to open with. A persisted choice wins over it. */
  pageSize?: number
  /** The page sizes the footer offers. */
  sizes?: number[]
}

export interface DataTableSelectionOptions {
  /** Row ids whose checkbox is disabled — rows the caller will not act on. */
  excludedIds?: React.Key[]
  /**
   * Offer "Select all N". Client-side that lists every id, and is on by default. In `manual` mode
   * it makes the selection `mode: 'all'` — every row matching the filters, minus the unticked —
   * which only a server can act on, so it is off until the caller says the bulk actions accept it.
   */
  selectAllMatching?: boolean
}

export interface DataTableSearchOptions {
  /**
   * The fields the term is matched against.
   *
   * Client-side this is the list actually searched, so an empty list means the box does nothing.
   * In `manual` mode the server decides, and this is only what the box's tooltip lists — see
   * `AsyncDataTable`'s `getSearchableFields` for loading it from the backend.
   */
  searchableFields?: SearchableField[]
  /** Apply as you type. On by default; off puts the term behind the magnifier button. */
  submitOnChange?: boolean
  /** How long to wait before applying while typing. */
  debounce?: number
  /** Passed to `getSearchableFields` in the async table — which entity's fields to load. */
  domain?: string
  /** The box's placeholder; `messages.search.placeholder` when omitted. */
  placeholder?: string
}

/** One field the full-text search can look in, as the box's tooltip lists it. */
export interface SearchableField {
  field: string
  label?: string
}

export interface DataTableToolbarOptions {
  /**
   * How many of the table's actions (`headerActions`, plus Export on the async table) are drawn
   * as buttons; the rest go to the "More table actions" menu. Default 2.
   */
  maxVisibleActions?: number
}

/** What a quick view's parts are handed beside the row. */
export interface DataTableRowPreviewContext {
  close: () => void
  /** Moves to the next row of the current page. A no-op on the last. */
  next: () => void
  /** Moves to the previous row of the current page. A no-op on the first. */
  prev: () => void
  /** The row's position on the page, zero-based. */
  index: number
  /** How many rows the page holds. */
  count: number
}

/**
 * A quick look at one row without leaving the table: a panel over the rows, opened from the row's
 * eye button or its "Quick view" menu row — never by clicking the row itself, which stays free for
 * whatever the row's own link or selection does.
 */
export interface DataTableRowPreview<TRow = PlainTableRowData> {
  /** The panel's content. The screen's, not the table's: details, lines, a status. */
  render: (row: TRow, context: DataTableRowPreviewContext) => React.ReactNode
  /** The heading. Defaults to `messages.preview.title`. */
  title?: (row: TRow) => React.ReactNode
  subtitle?: (row: TRow) => React.ReactNode
  /** Actions along the foot of the panel — "Open order", "Print label". */
  footer?: (row: TRow, context: DataTableRowPreviewContext) => React.ReactNode
}

/** The panels a table opens over its rows. */
export type DataTableSheetKind = "filters" | "preview"

export interface DataTableFiltersOptions {
  /**
   * Where the filter form opens. `'sheet'` (the default) slides in from the right over the rows,
   * inside the table — non-modal, so the rows and chips stay usable while it applies as you edit —
   * and covers the screen below 768px. `'popover'` is the earlier dropdown under the button.
   */
  container?: "sheet" | "popover"
  /** Apply as the user edits. On by default; off puts the filters behind an Apply button. */
  submitOnChange?: boolean
  /** How long to wait before applying while the user is still editing. */
  debounce?: number
}

/**
 * A toolbar action, plus where it sits among the actions everything else contributes.
 *
 * `order` is the table's concern rather than the action list's: `Actions` draws a list someone
 * wrote in the order they wrote it, whereas this toolbar assembles one list
 * out of three sources — the caller's, the async layer's Refresh and Export, and the table's own
 * Columns and Filters — none of which knows the others exist. The anchors are in
 * `data-table.constants.ts`, so an action can be placed relative to them.
 */
export type DataTableAction = Action &
  Orderable & {
    /**
     * Ask before running. The action's `onClick` then runs from the dialog's confirm button
     * instead of from the action itself. A `variant: 'destructive'` action gets the destructive
     * dialog (red confirm), anything else the plain one. Only for an action that runs
     * something — one that opens a menu or a panel has nothing to confirm yet.
     */
    confirm?: DataTableActionConfirm
  }

/** What the confirmation dialog in front of an action says. */
export interface DataTableActionConfirm {
  title: React.ReactNode
  description?: React.ReactNode
  /** The confirm button's label. Defaults to `messages.confirm.confirm`, or `.delete` for a destructive action. */
  confirmLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
}

/**
 * What a bulk action acts on. Read `mode` before `selectedIds`: in `'all'` mode the ids are only the
 * rows that happen to be loaded, and the selection is "everything matching `filtering`, except
 * `excludedIds`" — which is what has to go to the server.
 */
export interface DataTableBulkActionContext<TRow = PlainTableRowData> {
  selectedIds: React.Key[]
  selectedRows: TRow[]
  mode: SelectionMode
  /** In `'all'` mode, the rows unticked since everything was selected. */
  excludedIds: React.Key[]
  /** How many rows the action will reach — every match less the unticked, in `'all'` mode. */
  count: number
  /** The filtering in force, search term included — what `'all'` means. */
  filtering: FilteringState
  /**
   * `filtering` as the server is asked it — keyed by `serverField`, empty filters dropped, the
   * same payload `getData` receives. Filled in by `AsyncDataTable`; absent on a client-side table.
   */
  serverFiltering?: Record<string, unknown>
}

/** One action, or a nested array of them — nesting draws a separator, as in `Actions`. */
export type DataTableActionEntry = DataTableAction | DataTableAction[]

/** How much room a row takes. `'compact'` fits more rows in the same height. */
export type DataTableDensity = "default" | "compact"

/** What a caller can replace in the composed table. */
export interface DataTableSlots<TRow = PlainTableRowData> {
  toolbar?: React.ComponentType<DataTableToolbarProps>
  footer?: React.ComponentType<DataTableFooterProps>
  activeFilters?: React.ComponentType<DataTableActiveFiltersProps>
  /**
   * More sections for the View options panel, drawn after the dividers switch — the async table
   * puts Auto-refresh here, which is how the composed table stays unaware of refreshing. Use
   * `DataTableViewPanelSection` for the title.
   */
  viewPanelSections?: React.ComponentType
  /** The bar that replaces the toolbar while rows are selected — see `bulkActions`. */
  bulkBar?: React.ComponentType<DataTableBulkBarProps>
  /** Everything `PlainTable` itself can have replaced, passed straight down. */
  plainTable?: PlainTableSlots<TRow>
}

export interface DataTableHandle {
  /** The table underneath, for the scroll container and the `<table>` element. */
  plainTable: PlainTableHandle | null
}

export interface DataTableProps<TRow = PlainTableRowData> {
  /**
   * Identity. Persisted state is keyed by it, and it is how `tableApi` reaches this table from
   * outside the tree that renders it. Two tables sharing an id share their saved layout.
   */
  id?: string
  columns: DataTableColumn<TRow>[]
  rows: TRow[]
  /** Row identity. Defaults to `row.id`, falling back to the index. */
  getRowId?: (row: TRow, index: number) => React.Key
  /**
   * What a row is called, for its checkbox's accessible name: `Select ${getRowLabel(row)}`.
   * Absent, the checkbox says `Select row ${id}` — unique, but an id is rarely what a user knows a
   * row by.
   */
  getRowLabel?: (row: TRow) => string

  loading?: boolean
  error?: React.ReactNode
  onRetry?: () => void

  /**
   * Server mode: the rows are one page that the server has already filtered, sorted and cut.
   * The table then tracks the state and reports it instead of applying it.
   */
  manual?: boolean
  /** What the server says the whole result set holds. Only read when `manual`. */
  totalItems?: number

  /**
   * Where the table steps from `sm` to `md` to `lg`, in px of its own width. Defaults to
   * `DATA_TABLE_SIZE_STEPS` (640 / 960).
   */
  sizeSteps?: { md: number; lg: number }

  /** Off by default — nothing touches the user's browser storage unless asked. */
  persistState?: boolean
  /** Scopes persisted state per user, so a shared machine does not share table layouts. */
  userId?: string | number
  storageKey?: string

  /** A checkbox column, and the header controls that go with it. */
  withSelection?: boolean
  /** A full-text box in the toolbar. */
  withSearch?: boolean
  withPagination?: boolean
  /**
   * What the rows are called, plural and lower-case — "1–25 of 67 orders" in the footer, and
   * wherever else the table counts them. Defaults to `messages.pagination.items(total)`.
   */
  itemsLabel?: string
  /** The Columns panel. On by default — hiding a column is the commonest thing a user wants. */
  withColumnsVisibility?: boolean
  withColumnReorder?: boolean
  withColumnPinning?: boolean
  /**
   * Cap the table at the bottom of the viewport instead of letting it grow to its content, so
   * the rows are the only part that scrolls: the header stays put and the pager stays on screen.
   * A table shorter than the window is unaffected.
   *
   * Two custom properties on the root tune it — `--data-table-reserved` (the room left below the
   * table, `1rem`) and `--data-table-min-height` (the floor on a short window, `20rem`).
   */
  withAdjustHeight?: boolean

  sortOptions?: DataTableSortOptions
  paginationOptions?: DataTablePaginationOptions
  selectionOptions?: DataTableSelectionOptions
  searchOptions?: DataTableSearchOptions
  filtersOptions?: DataTableFiltersOptions
  toolbarOptions?: DataTableToolbarOptions

  /** Declaring filters is what turns filtering on — there is no separate flag for it. */
  filters?: DataTableFilter[]
  /** The row menu. Declaring actions is what adds the column they live in. */
  rowActions?: DataTableRowActionEntry<TRow>[]
  /**
   * A quick view of one row in a panel over the rows. Adds an eye button to each row's actions
   * (and "Quick view" to its menu); the panel steps through the page with its arrows, and only
   * one panel — this or the filters — is up at a time.
   */
  rowPreview?: DataTableRowPreview<TRow>
  /** Controlled: the row in the quick view, by id, or `null` for none. */
  activeRowId?: React.Key | null
  /** The quick view opened, moved to another row, or closed (`null`). */
  onActiveRowChange?: (rowId: React.Key | null) => void
  /**
   * Overrides the width the actions column works out for itself.
   *
   * That calculation assumes every control in the cell is a 28px square, which is what `Actions`
   * draws at `icon-sm`. Required alongside any action whose `size` draws a label instead — its
   * width depends on the label's text — or whose `render` draws something else entirely. The
   * synthetic column is not reachable any other way.
   */
  rowActionsColumnWidth?: number
  /**
   * What can be done to the selected rows. Given, a bar replaces the toolbar while anything is
   * selected: the count, "Select all N matching" where that is on offer, Clear, these actions and
   * a close button. A function is called with what is selected (`mode` first — see
   * `DataTableBulkActionContext`), so an action can say "Cancel 12 orders".
   *
   * Without it the toolbar stays put during a selection, as it always has.
   */
  bulkActions?:
    | DataTableActionEntry[]
    | ((context: DataTableBulkActionContext<TRow>) => DataTableActionEntry[])
  /**
   * What can be done to the whole dataset — the toolbar's RIGHT cluster: at most
   * `toolbarOptions.maxVisibleActions` buttons, the rest in a "More table actions" menu. A page's
   * one "create" action belongs in the page header, not here.
   */
  headerActions?: DataTableActionEntry[]
  /**
   * The toolbar's LEFT cluster, after the search box, beside the table's own Filters and View
   * options. (The name is from when it sat on the right.)
   *
   * This is the seam the async layer contributes Refresh and Export through, and the one a
   * consumer adds anything else through — which is why the table itself knows about neither.
   */
  rightActions?: DataTableActionEntry[]

  // ===================== controlled state =====================
  //
  // Each of these hands one piece of state to the caller. Given, the table stops holding that
  // piece itself: an interaction only REPORTS the next value through the paired callback, and
  // the screen changes once the caller passes it back. Omitted, the table holds it as before.
  // Controlled state is never read from or written to storage — the caller owns it, persistence
  // included.

  /** Controlled sort, paired with `onSortChange`. `{ columnId: '', direction: '' }` is unsorted. */
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  /**
   * Controlled page, one-based, paired with `onPageChange`. Controlled, the jump back to page 1
   * after a filter or page-size change is reported too — the table cannot make it itself.
   */
  page?: number
  onPageChange?: (page: number) => void
  /** Controlled rows per page, paired with `onPageSizeChange`. */
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  /** Controlled selection, paired with `onSelectedIdsChange`. */
  selectedIds?: readonly React.Key[]
  onSelectedIdsChange?: (selectedIds: React.Key[]) => void
  /**
   * Controlled filtering, paired with `onFilteringChange` — the search term included, under its
   * reserved key, so one value describes everything that narrows the rows.
   */
  filtering?: FilteringState
  onFilteringChange?: (filtering: FilteringState) => void

  onColumnVisibilityChange?: (state: ColumnVisibilityState) => void
  onColumnOrderChange?: (state: ColumnOrderState) => void
  onColumnPinningChange?: (state: ColumnPinningState) => void
  /**
   * Everything at once, on every change.
   *
   * This is what a server-backed table listens to: one callback carrying the whole view, so the
   * consumer decides what warrants a request rather than stitching eight callbacks together.
   */
  onStateChange?: (state: DataTableState<TRow>) => void

  /**
   * Row height and cell padding. `'compact'` puts `--density-compact` on the root; the default
   * emits no class at all. A good candidate for `DataTableConfigProvider`, where it applies to
   * every table in the app.
   */
  density?: DataTableDensity
  /**
   * Vertical lines between the cells. Off by default. Like `density`, it is the starting point:
   * the user switches it in View options, and that choice wins (and persists, with
   * `persistState`). A good candidate for `DataTableConfigProvider`.
   */
  columnDividers?: boolean
  /** The user changed the density in View options. */
  onDensityChange?: (density: DataTableDensity) => void
  /** The user switched the column dividers in View options. */
  onColumnDividersChange?: (columnDividers: boolean) => void

  slots?: DataTableSlots<TRow>
  /** Passed straight to `PlainTable` — column resizing and alignment options live there. */
  plainTableProps?: Omit<
    PlainTableProps<TRow>,
    | "id"
    | "userId"
    | "persistState"
    | "columns"
    | "rows"
    | "getRowId"
    | "loading"
    | "error"
    | "onRetry"
    | "slots"
    | "isRowSelected"
    | "ref"
  >

  className?: string
  ref?: React.Ref<DataTableHandle>
}
