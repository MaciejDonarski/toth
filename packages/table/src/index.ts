/**
 * @toth/table — PlainTable, DataTable and AsyncDataTable on top of @toth/ui and @toth/form.
 *
 * Styled with Tailwind classes scanned from source (no stylesheet to import). UI strings come
 * from `TableMessages` (`enMessages` / `plMessages`), set app-wide on `DataTableConfigProvider`.
 */

// ===================== the tables =====================

export type { DataTableConfigProviderProps } from "./components/data-table/config-context"
export {
  DataTableConfigProvider,
  useDataTableConfig,
} from "./components/data-table/config-context"
export { DataTable } from "./components/data-table/data-table"
export * from "./components/data-table/data-table.constants"
export * from "./components/data-table/data-table.types"
export * from "./components/plain-table"
export { useTableLocale, useTableMessages } from "./hooks/use-table-locale"
export type { ResolvedTableLocale } from "./hooks/use-table-locale"
export type {
  AsyncDataTableConfig,
  DataTableConfig,
  TableLocaleSettings,
} from "./lib/data-table-config-context"

// ===================== language =====================

export { enMessages, mergeMessages, plMessages } from "./lib/messages"
export type { TableMessages, TableMessagesInput } from "./lib/messages"

// The state hooks, published so a consumer building an unusual table can compose the same
// pieces rather than reimplementing them.
export * from "./components/data-table/hooks"

// ===================== the parts =====================
//
// Every default a `DataTable` slot can replace, so replacing one means wrapping it rather than
// rewriting it.

export type { DataTableActiveFiltersProps } from "./components/active-filters"
export { DataTableActiveFilters } from "./components/active-filters"
export type { DataTableBulkBarProps } from "./components/bulk-bar"
export { DataTableBulkBar } from "./components/bulk-bar"
export type { DataTableColumnsPanelProps } from "./components/columns-panel"
export { DataTableColumnsPanel } from "./components/columns-panel"
export type {
  DataTableFilterFieldProps,
  DataTableFilterPanelProps,
} from "./components/filter-panel"
export {
  DataTableFilterField,
  DataTableFilterPanel,
} from "./components/filter-panel"
export type { DataTablePaginationProps } from "./components/pagination"
export { DataTablePagination } from "./components/pagination"
export type {
  DataTableRowAction,
  DataTableRowActionEntry,
} from "./components/row-actions"
export { DataTableRowActionsCell } from "./components/row-actions"
export type { DataTableSearchProps } from "./components/search"
export { DataTableSearch } from "./components/search"
export {
  DataTableSelectionCell,
  DataTableSelectionHeaderCell,
} from "./components/selection-cells"
export { DataTableSortLabel } from "./components/sort-button"
export type { DataTableFooterProps } from "./components/table-footer"
export { DataTableFooter } from "./components/table-footer"
export type { DataTableToolbarProps } from "./components/toolbar"
export { DataTableToolbar } from "./components/toolbar"
export type { DataTableViewPanelProps } from "./components/view-panel"
export {
  DataTableViewPanel,
  DataTableViewPanelSection,
} from "./components/view-panel"

// ===================== filtering =====================
//
// The declaration a caller writes, and the shapes the state is held in. The mapping between them
// — which control a type draws, how a value is enveloped, which rows a filter keeps — stays
// internal: it is the table"s business, and publishing it would make every one of those decisions
// a compatibility promise.

export type {
  DataTableFilter,
  DataTableFilterType,
  DateFilter,
  DateRangeFormValue,
  DateRangeValue,
  FilterEnvelope,
  FilterFormValue,
  FilteringState,
  FilterValue,
  MultiSelectFilter,
  NumberFilter,
  NumberRangeValue,
  SearchEntry,
  SelectFilter,
  TagsFilter,
  TextFilter,
} from "./lib/filter-types"

// ===================== state =====================

export type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnPinSide,
  ColumnVisibilityState,
  DataTableState,
  PaginationState,
  SelectionMode,
  SelectionState,
  SortDirection,
  SortState,
} from "./lib/table-state"

// ===================== the imperative escape hatch =====================
//
// Reach a mounted table by its `id` from outside the tree that renders it. Everything that can go
// through props should — this exists for the cases that cannot, such as a toolbar in another branch
// resetting a table"s column widths.

export { useRegisterTableScope } from "./hooks/use-register-table-scope"
export { useTableStorage } from "./hooks/use-table-storage"
export { tableApi } from "./lib/table-api"
export type { TableScopeApi, TableSnapshot } from "./lib/table-registry"
export {
  emitChange,
  getScope,
  getSnapshot,
  registerScope,
  subscribe,
  unregisterScope,
} from "./lib/table-registry"

// ===================== against a server =====================

export {
  AsyncDataTable,
  AsyncDataTableBase,
} from "./components/async-data-table/async-data-table"
export type {
  AsyncDataTableBaseProps,
  AsyncDataTableProps,
  DataTableExportOptions,
  DataTableExportRequest,
  DataTableExportScope,
  DataTablePlugin,
  DataTableRefreshOptions,
  DataTableRequest,
  DataTableRequestContext,
  DataTableSorting,
} from "./components/async-data-table/async-data-table.types"
export { AsyncDataTableFooter } from "./components/async-data-table/async-data-table-footer"
