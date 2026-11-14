import type { DataTableRefreshOptions } from "../components/async-data-table/async-data-table.types"
import type { DataTableProps } from "../components/data-table/data-table.types"
import type { Locale } from "date-fns"
import * as React from "react"

import type { TableMessagesInput } from "./messages"

/**
 * Language and date settings for every table below a `<DataTableConfigProvider>` — the same shape
 * as `@toth/form`'s `FormLocaleSettings`, so an app that configured one knows the other on sight.
 * Everything is optional: without a provider a table speaks English and writes dates as `PP`.
 */
interface TableLocaleSettings {
  /** date-fns locale for formatting dates and numbers. Defaults to en-US. */
  locale?: Locale
  /** date-fns format for a date-only value. Defaults to `"PP"`. */
  dateFormat?: string
  /** date-fns format for a date with time. Defaults to `"PPp"`. */
  dateTimeFormat?: string
  /** UI strings; missing keys fall back to English. */
  messages?: TableMessagesInput
}

// Application-wide defaults for every table below the provider.
//
// It exists because the settings a product wants the same everywhere — this user, persist state,
// this page size, these page sizes, filters behind an Apply button, this date format — are exactly
// the ones a caller would otherwise repeat at every call site and eventually get wrong at one of
// them.
//
// Most of what it holds is a subset of `DataTableProps`, and the resolution is `defaults →
// provider → props`, so a single table always overrides the provider rather than the other way
// round. Data, identity and controlled state are deliberately not part of it: `id`, `columns`,
// `rows` and `sort` / `page` / `pageSize` / `selectedIds` / `filtering` belong to one table.
//
// `AsyncDataTable` resolves its own props through the same merge, so everything here reaches the
// async layer too — `persistState` / `userId` / `storageKey` included, which its auto-refresh
// storage reads — and `AsyncDataTableConfig` adds the async layer's own app-wide settings. A
// `DataTable` ignores those.

/**
 * The async layer's app-wide settings: what an `AsyncDataTable` offers that a plain `DataTable`
 * has no use for.
 *
 * `withExport` / `exportOptions` are deliberately absent: an export is one endpoint's, so turning it
 * on everywhere would offer an Export button on tables with nothing behind it.
 */
type AsyncDataTableConfig = {
  /**
   * The Refresh control and auto-refresh — "every table offers these intervals". Merged with a
   * table's own `refreshOptions` member by member; a table's `intervals` replace the provider's.
   */
  refreshOptions?: DataTableRefreshOptions
  /** Show when the data on screen was fetched. */
  withLastUpdate?: boolean
}

/** The props a provider may set for every table under it, plus the app-wide language settings. */
type DataTableConfig<TRow = never> = AsyncDataTableConfig &
  TableLocaleSettings &
  Partial<
    Omit<
      DataTableProps<TRow>,
      | "id"
      | "columns"
      | "rows"
      | "ref"
      | "className"
      | "error"
      | "onRetry"
      | "totalItems"
      // Controlled state is one table's, never an app's: a provider setting `page` would pin
      // every table under it to the same page.
      | "sort"
      | "page"
      | "pageSize"
      | "selectedIds"
      | "filtering"
    >
  >

// `null`, not a default object, so a reader can tell "no provider" from "a provider with an
// (unlikely) empty config" — which is what lets `useDataTableConfig` hand a table its own props
// back untouched in the common case.
const DataTableConfigContext = React.createContext<DataTableConfig | null>(null)

export { DataTableConfigContext }
export type { AsyncDataTableConfig, DataTableConfig, TableLocaleSettings }
