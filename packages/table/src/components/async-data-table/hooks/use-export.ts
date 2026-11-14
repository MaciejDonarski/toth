import { useTableMessages } from "../../../hooks/use-table-locale"
import type { TableMessages } from "../../../lib/messages"
import { EXPORT_ACTION_ORDER } from "../../data-table/data-table.constants"
import type {
  DataTableActionEntry,
  DataTableColumn,
} from "../../data-table/data-table.types"
import { prepareServerFiltering } from "../../../lib/apply-filters"
import type { DataTableFilter } from "../../../lib/filter-types"
import type { DataTableState } from "../../../lib/table-state"
import * as React from "react"

import type {
  DataTableExportOptions,
  DataTableExportRequest,
  DataTableExportScope,
} from "../async-data-table.types"
import { resolveExportFields, resolveSorting } from "../request"

const SCOPES: DataTableExportScope[] = [
  "all",
  "all-rows-visible-columns",
  "current-page",
]

function defaultLabels(
  messages: TableMessages["export"]
): Record<DataTableExportScope, string> {
  return {
    all: messages.all,
    "all-rows-visible-columns": messages.allRowsVisibleColumns,
    "current-page": messages.currentPage,
  }
}

/**
 * A hook of its own rather than inline in `useExport`, so `runExport` reaches it only as an
 * ordinary function parameter. Built inline, this menu action's `onClick` rows would close over
 * `runExport` in the same scope where the compiler can see it read `stateRef`/`columnsRef` —
 * `react-hooks/refs` treats that as a ref escaping render, even though nothing here calls it
 * before a click does. Crossing a hook boundary is what tells the analysis the ref access is not
 * its concern any more.
 */
function useExportAction(
  enabled: boolean,
  options: DataTableExportOptions | undefined,
  isExporting: boolean,
  runExport: (scope: DataTableExportScope) => void
): DataTableActionEntry | null {
  const messages = useTableMessages().export

  return React.useMemo(() => {
    if (!enabled || !options?.onExport) {
      return null
    }

    // Built inside the memo rather than beside it: a fresh object per render outside would
    // either be a dependency that always changed, or a dependency quietly left out.
    const labels = { ...defaultLabels(messages), ...options.labels }

    return {
      label: options.labels?.trigger ?? messages.trigger,
      icon: "file-down",
      order: EXPORT_ACTION_ORDER,
      loading: isExporting,
      standalone: "desktop",
      menuItems: SCOPES.map((scope) => ({
        key: scope,
        label: labels[scope],
        disabled: isExporting,
        onClick: () => runExport(scope),
      })),
    }
  }, [enabled, options, isExporting, runExport, messages])
}

export interface UseExportOptions<TRow> {
  enabled: boolean
  options?: DataTableExportOptions
  /** The live table state, read at the moment an export is asked for rather than at render. */
  stateRef: React.RefObject<DataTableState<TRow> | null>
  columnsRef: React.RefObject<readonly DataTableColumn<TRow>[]>
  filtersRef: React.RefObject<readonly DataTableFilter[]>
}

/**
 * The Export control.
 *
 * Three choices rather than one, because "export" means three different things depending on who is
 * asking: everything there is, everything I have narrowed to, or exactly what is on my screen.
 * Guessing which one someone meant produces the wrong file and no way to tell.
 *
 * The table builds the REQUEST and the application performs it. `onExport` is the entire coupling
 * to a backend, which is why nothing in this package knows what a CSV is.
 */
export function useExport<TRow>({
  enabled,
  options,
  stateRef,
  columnsRef,
  filtersRef,
}: UseExportOptions<TRow>) {
  const [isExporting, setIsExporting] = React.useState(false)

  const runExport = React.useCallback(
    async (scope: DataTableExportScope) => {
      const state = stateRef.current

      if (!options?.onExport || !state) return

      const columns = columnsRef.current
      const columnIds =
        scope === "all"
          ? columns.map((column) => column.id)
          : state.visibleColumns

      const request: DataTableExportRequest = {
        scope,
        fields: resolveExportFields(columnIds, columns),
        sorting: resolveSorting(state.sort, columns),
        filtering: prepareServerFiltering(state.filtering, filtersRef.current),
        // Only the "this page" scope carries a page. The other two mean the whole result
        // set, and sending a page with them would quietly cap the export at 25 rows.
        pagination:
          scope === "current-page"
            ? {
                currentPage: state.pagination.currentPage,
                pageSize: state.pagination.pageSize,
              }
            : undefined,
      }

      setIsExporting(true)

      try {
        await options.onExport(request)
      } catch (error) {
        options.onError?.(error)
      } finally {
        // In `finally`, so a rejected export leaves the table usable rather than stuck
        // behind a spinner.
        setIsExporting(false)
      }
    },
    [options, stateRef, columnsRef, filtersRef]
  )

  const exportAction = useExportAction(enabled, options, isExporting, runExport)

  return { exportAction, isExporting }
}
