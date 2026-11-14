import type {
  DataTableProps,
  SearchableField,
} from "../data-table/data-table.types"
import type { SortDirection } from "../../lib/table-state"
import type * as React from "react"

// What the async layer asks the application for, and how the application tells it what to offer.
//
// Nothing here mentions GraphQL, HTTP or a client library, and that is the point: this package
// knows how a table is looked at, and the application knows how its backend is asked. The two meet
// at `getData` and at the two callbacks in `exportOptions` / `searchOptions`.

/** How the server is told to sort. Absent from a request when nothing is sorted. */
export interface DataTableSorting {
  /** The table's own id for the column, so a consumer can tell which one was clicked. */
  columnId: string
  dir: Exclude<SortDirection, "">
  /** The field to sort BY — `column.sortField`, else `column.field`, else the id. */
  field: string
}

/** One page of rows, as the table asks for it. */
export interface DataTableRequest {
  /**
   * The fields behind the visible columns. A hidden column is not asked for, which is most of
   * the point of hiding one.
   */
  fields: string[]
  pagination: { currentPage: number; pageSize: number }
  /**
   * Absent when nothing is sorted, rather than an empty object.
   *
   * The old grid sent `{}` there to work around a null check in its own gql layer. An absent key
   * says "no sort" once and unambiguously.
   */
  sorting?: DataTableSorting
  /** Keyed by each filter's `serverField`, with empty filters already dropped. */
  filtering: Record<string, unknown>
}

/** What `getData` is handed beside the request. */
export interface DataTableRequestContext {
  /**
   * Aborted the moment a newer request starts, and when the table unmounts.
   *
   * Pass it to `fetch` (or your client's equivalent) so a superseded request is cancelled rather
   * than raced — and check `signal.aborted` before writing rows, so an answer that arrives late
   * for a question nobody is asking any more never lands on screen.
   */
  signal: AbortSignal
}

/** Which rows and columns an export was asked for. */
export type DataTableExportScope =
  /** Everything: every row of the result set, every column the table has. */
  | "all"
  /** Every row of the result set, but only the columns on screen. */
  | "all-rows-visible-columns"
  /** Just this page, as it is on screen. */
  | "current-page"

export interface DataTableExportRequest {
  scope: DataTableExportScope
  fields: string[]
  sorting?: DataTableSorting
  filtering: Record<string, unknown>
  /** Absent for a whole-result-set export — there is no page to ask for. */
  pagination?: { currentPage: number; pageSize: number }
}

export interface DataTableExportOptions {
  /**
   * Runs the export.
   *
   * The whole coupling to a backend, in one function. It is handed what to export and decides
   * how — build the gql document, call the endpoint, save the file. Rejecting is how it reports
   * failure; `onError` is told, and the spinner stops either way.
   */
  onExport: (request: DataTableExportRequest) => Promise<void>
  onError?: (error: unknown) => void
  /** Replaces the labels on the three choices, for translation. */
  labels?: Partial<Record<DataTableExportScope, string>> & { trigger?: string }
}

export interface DataTableRefreshOptions {
  /** Start with auto-refresh on. */
  enabled?: boolean
  /** How often to refetch, in milliseconds. `null` turns auto-refresh off. */
  interval?: number | null
  /**
   * The intervals to offer in the Refresh panel, in milliseconds.
   *
   * Given none, Refresh is a plain button that refetches once — no panel, because a panel with
   * one option in it is a panel that should not exist.
   */
  intervals?: number[]
}

/**
 * A plugin: a HOC around the async table, plus a name to know it by.
 *
 * `enhance` receives the wrapped component and the descriptor's own `props`, so a plugin can
 * transform props, wrap `getData`, inject columns, filters or actions, or render siblings.
 *
 * `name` is a stable, minification-safe identity, which is what makes a list of plugins something
 * a consumer can filter, dedupe or check:
 *
 *     plugins.filter((plugin) => plugin.name !== 'crud')
 */
export interface DataTablePlugin<TRow = never, TProps = unknown> {
  name: string
  enhance: (
    Component: React.ComponentType<AsyncDataTableBaseProps<TRow>>,
    props?: TProps
  ) => React.ComponentType<AsyncDataTableBaseProps<TRow>>
  props?: TProps
}

/** The async table without the plugin host around it — what a plugin's `enhance` wraps. */
export interface AsyncDataTableBaseProps<TRow> extends Omit<
  DataTableProps<TRow>,
  "manual" | "totalItems"
> {
  /**
   * Fetches a page.
   *
   * Called whenever the part of the state the server cares about changes — paging, sorting,
   * filtering, or a newly shown column whose field was never fetched. Showing a column whose
   * data is already in `rows`, and changing the selection, never call it.
   *
   * The previous call's `signal` is aborted when the next one starts. Return the promise, if
   * there is one: the table then stamps "last updated" when the LATEST request settles, and
   * ignores one that settles after it was superseded.
   */
  getData: (
    request: DataTableRequest,
    context: DataTableRequestContext
  ) => void | Promise<unknown>
  /** What the server says the whole result set holds. */
  totalItems?: number
  /**
   * Change it to force a refetch of the current state — after a mutation elsewhere, say.
   *
   * The first value is ignored: the initial load is already covered by the table reporting its
   * opening state.
   */
  refreshToken?: string | number
  refreshOptions?: DataTableRefreshOptions
  withExport?: boolean
  exportOptions?: DataTableExportOptions
  /** Show when the data on screen was fetched. */
  withLastUpdate?: boolean
  /**
   * Loads the fields the full-text search can look in.
   *
   * Client-side the searchable fields are declared in `searchOptions.searchableFields`; against a
   * server they are the server's to know, and this is how the table asks.
   */
  getSearchableFields?: (domain?: string) => Promise<SearchableField[]>
}

export interface AsyncDataTableProps<
  TRow,
> extends AsyncDataTableBaseProps<TRow> {
  /**
   * Plugins, composed around the table outermost-first.
   *
   * Pass a STABLE array — define it at module scope. A new array identity rebuilds the composed
   * component, which REMOUNTS the table: its state is lost and it refetches. The same goes for
   * each descriptor's `props`, which are captured when the composition is built, so per-render
   * data belongs on the table's own props instead.
   */
  plugins?: DataTablePlugin<TRow>[]
}
