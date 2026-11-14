import type { AsyncDataTableBaseProps } from "../async-data-table/async-data-table.types"
import type { DataTableConfig } from "../../lib/data-table-config-context"
import { DataTableConfigContext } from "../../lib/data-table-config-context"
import { mergeConfig, omitKeys } from "../../lib/object"
import * as React from "react"

import type { DataTableProps } from "./data-table.types"

// The one provider a product wraps itself in to configure every table at once. What it may set,
// and why the shape is what it is, is documented with `DataTableConfig` in
// `lib/data-table-config-context` — this file is the provider and the ways of reading it back.

export interface DataTableConfigProviderProps {
  config: DataTableConfig
  children: React.ReactNode
}

function DataTableConfigProvider({
  config,
  children,
}: DataTableConfigProviderProps) {
  // A nested provider overrides the outer one key by key (messages included), like
  // `FormDefaultsProvider` does. Memoised on the caller's object rather than on its contents: a
  // provider given a new object every render would re-resolve every table under it every render,
  // and the fix for that belongs at the call site, where the object is written.
  const parent = React.use(DataTableConfigContext)
  const value = React.useMemo(
    () =>
      parent
        ? {
            ...mergeConfig<DataTableConfig>(parent, config),
            // A date-fns locale is a plain object too; it is replaced, never merged.
            locale: config.locale ?? parent.locale,
          }
        : config,
    [parent, config]
  )

  return (
    <DataTableConfigContext value={value}>{children}</DataTableConfigContext>
  )
}

// The language settings are read from the context by `useTableLocale()` in the part that needs
// them, so they never become a table's props — leaving them in would make `<DataTable
// messages={…}>` type-check against the resolved props and then silently do nothing. The async
// layer's settings are kept out of a plain `DataTable`'s props for the same reason. Module-level,
// so the memo below keeps its identity.
const NOT_TABLE_PROPS = [
  "locale",
  "dateFormat",
  "dateTimeFormat",
  "messages",
] as const
const NOT_DATA_TABLE_PROPS = [
  ...NOT_TABLE_PROPS,
  "refreshOptions",
  "withLastUpdate",
] as const

function useResolvedProps<TProps extends object>(
  props: TProps,
  omit: readonly string[]
): TProps {
  const config = React.use(DataTableConfigContext)

  return React.useMemo(() => {
    if (!config) return props

    return mergeConfig<TProps>(
      omitKeys(config as Record<string, unknown>, omit) as Partial<TProps>,
      props
    )
  }, [config, props, omit])
}

/**
 * One table's props, with any provider above it filled in underneath them.
 *
 * Returns the props unchanged when there is no provider — the common case, and one that should cost
 * nothing.
 */
function useDataTableConfig<TRow>(
  props: DataTableProps<TRow>
): DataTableProps<TRow> {
  return useResolvedProps(props, NOT_DATA_TABLE_PROPS)
}

/**
 * The same for `AsyncDataTable`, whose own props — `refreshOptions`, `withLastUpdate`, and the
 * `persistState` / `userId` / `storageKey` its auto-refresh storage reads — sit above the
 * `DataTable` it renders and would otherwise never see the provider.
 */
function useAsyncDataTableConfig<TRow>(
  props: AsyncDataTableBaseProps<TRow>
): AsyncDataTableBaseProps<TRow> {
  return useResolvedProps(props, NOT_TABLE_PROPS)
}

export { DataTableConfigProvider, useAsyncDataTableConfig, useDataTableConfig }
