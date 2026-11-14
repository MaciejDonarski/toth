import { useIsMobile } from "../../../internal/hooks/use-is-mobile"

import { useTableMessages } from "../../../hooks/use-table-locale"
import { ACTIONS_COLUMN_ID, actionsColumnWidth } from "../data-table.constants"
import type { PlainTableColumn } from "../../plain-table/types"
import type {
  DataTableRowAction,
  DataTableRowActionEntry,
} from "../../row-actions/row-actions"
import {
  countRowActionControls,
  DataTableRowActionsCell,
  hasUnmeasurableWidth,
  isPromotable,
} from "../../row-actions/row-actions"
import * as React from "react"

// The row-menu column, which is the one synthetic column whose width is not a constant: an action
// declared `standalone` is drawn as a button beside the trigger, and the column has to be wide
// enough to hold it. `'desktop'` gives that width back below the `md` breakpoint, where the action
// is a menu row again.

function ActionsHeaderLabel() {
  const messages = useTableMessages()
  return React.createElement(
    "span",
    { className: "sr-only" },
    messages.rowActions.column
  )
}

function actionsHeaderLabel() {
  return React.createElement(ActionsHeaderLabel)
}

/** Everything about the column that does not depend on what it holds. */
const ACTIONS_COLUMN_BASE = {
  id: ACTIONS_COLUMN_ID,
  // Named for a screen reader and nobody else: a header cell with nothing in it is a column a
  // reader cannot announce, and the word would only crowd a 44px column on screen.
  label: actionsHeaderLabel,
  template: DataTableRowActionsCell,
  stickyRight: true,
  isResizable: false,
  isAlignable: false,
  align: "center",
  // The padding `actionsColumnWidth` was worked out with.
  // A finger needs 44px; the controls stay 28px squares, and the columns keep their widths.
  cellClassName:
    "[--plain-table-cell-padding-inline:0.5rem] pointer-coarse:[&_button]:relative pointer-coarse:[&_button]:after:absolute pointer-coarse:[&_button]:after:-inset-x-1 pointer-coarse:[&_button]:after:-inset-y-2",
} satisfies PlainTableColumn<never>

const warned = new Set<string>()

function warnOnce(key: string, message: string) {
  if (warned.has(key)) {
    return
  }

  warned.add(key)
  console.warn(message)
}

/** `entries.flat()` has already resolved any nested group, so this is always one action. */
function actionName<TRow>(action: DataTableRowAction<TRow>) {
  return String(
    action.key ?? (typeof action.label === "string" ? action.label : "?")
  )
}

/**
 * Two things, said once each in development, about an action that cannot be drawn the way it asked:
 *
 * - `standalone` with no `icon` and no wider `size` — it stays in the row menu, because the cell's
 *   default 28px square has no room for a label;
 * - a wider `size` with no `rowActionsColumnWidth` on the table — it IS drawn, but the column was
 *   sized for 28px squares and has no way to know how wide a label makes it.
 */
function warnUnresolvable<TRow>(
  entries: readonly DataTableRowActionEntry<TRow>[],
  hasOverrideWidth: boolean
) {
  for (const entry of entries.flat()) {
    const name = actionName(entry)

    if (entry.standalone !== undefined && !isPromotable(entry)) {
      warnOnce(
        `${name}:icon`,
        `[table] Row action "${name}" is standalone but has no icon, so it stays in the ` +
          "row menu. The actions cell draws its controls as 28px squares, which have no " +
          "room for a label."
      )
    }

    if (
      isPromotable(entry) &&
      hasUnmeasurableWidth(entry) &&
      !hasOverrideWidth
    ) {
      warnOnce(
        `${name}:width`,
        `[table] Row action "${name}" is standalone with a non-icon size, so its button ` +
          "draws a label whose width the actions column cannot compute — it was sized as " +
          "if every control were a 28px square. Pass the table's rowActionsColumnWidth."
      )
    }
  }
}

/**
 * The actions column for these row actions, or `null` when there is nothing to put in it.
 *
 * `null` rather than an empty column: every action being statically `hidden: true` is a caller
 * saying the menu does not apply here, and a pinned empty column in all 500 rows is the one thing
 * worse than no column.
 */
function useActionsColumn<TRow>(
  rowActions: readonly DataTableRowActionEntry<TRow>[] | undefined,
  overrideWidth?: number
): PlainTableColumn<never> | null {
  const isMobile = useIsMobile()

  // Not memoised, on purpose. It walks a handful of descriptors, and `rowActions` is an array
  // literal at almost every call site — a memo keyed on it would recompute every render anyway,
  // while costing the comparison.
  const controls = countRowActionControls(rowActions ?? [], isMobile)
  const width = overrideWidth ?? actionsColumnWidth(controls)

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      warnUnresolvable(rowActions ?? [], overrideWidth !== undefined)
    }
  }, [rowActions, overrideWidth])

  // Keyed on the NUMBER, which is the whole point. This object's identity reaches `sortedColumns`,
  // the `<colgroup>` and the sticky offsets — and, the expensive one, the `columns` prop of the
  // `React.memo`'d row, so a fresh object re-renders every row of the table on every keystroke in
  // the search box and every pointer move of a resize drag. A number stays equal even when the
  // caller passes a new `rowActions` array each render, so for every table that never promotes an
  // action this identity is as stable as the constant it replaced.
  return React.useMemo(
    () =>
      controls === 0
        ? null
        : {
            ...ACTIONS_COLUMN_BASE,
            minWidth: width,
            maxWidth: width,
            defaultWidth: width,
          },
    [controls, width]
  )
}

export { useActionsColumn }
