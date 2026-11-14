import * as React from "react"

import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Actions, type Action, type ActionsEntry } from "../../internal/actions"
import { Button } from "../../internal/button"
import { useActionConfirmation } from "../bulk-bar/action-confirmation"
import type { DataTableActionEntry } from "../data-table/data-table.types"

// What sits above the table: on the left, finding and viewing — the search box, Filters, View
// options, Refresh; on the right, what can be done to the whole dataset — Export, Import, "Print pick
// lists".
//
// The split is the whole design. Narrowing what is shown and acting on what is there are different
// kinds of act, and a single row that mixes "Export" with "Filters" makes a user read every button to
// find either. Finding goes first because it is what a user reaches for first. (It used to be the
// other way round: data actions on the left, view controls on the right.)
//
// The table's actions are capped: at most `maxVisibleActions` (2) are buttons, outlined, and the
// rest go to a "More table actions" menu at the end of the row. The one action that creates
// something — "Add order" — is not the table's at all: it belongs in the page header.
//
// The toolbar builds nothing itself. Both clusters arrive as `Actions` entries already sorted by
// `order`, which is what lets the async layer contribute Refresh and Export, and a consumer
// contribute anything, without the toolbar knowing any of them exist.

export interface DataTableToolbarProps {
  /** The right cluster: things to do to the data — at most `maxVisibleActions` as buttons. */
  actions?: ActionsEntry[]
  /**
   * The left cluster, after the search box: things that change how the table is shown — Filters,
   * View options, Refresh. (Named for where it used to sit.)
   */
  rightActions?: ActionsEntry[]
  /** The search box, if the table has one. */
  search?: React.ReactNode
  /** How many of `actions` are drawn as buttons before the rest go to the menu. Default 2. */
  maxVisibleActions?: number
  /**
   * How wide the table is. Below `lg` one table action fewer is a button; at `sm` none are, the
   * search box takes a row of its own, and the view controls past Filters and View options
   * (Refresh) move into the "⋯" menu with the table actions.
   */
  size?: "sm" | "md" | "lg"
  className?: string
}

const DEFAULT_MAX_VISIBLE_ACTIONS = 2

/** How many of the table's actions are buttons at each width — `max` at `lg`, one fewer at `md`. */
function budgetFor(size: DataTableToolbarProps["size"], max: number) {
  if (size === "sm") return 0
  if (size === "md") return Math.min(max, 1)

  return max
}

/**
 * `standalone: 'desktop'` asks "is there room?", and `Actions` answers by the WINDOW. In a table the
 * question is the table's width, so it is answered here — and `Actions` only ever sees a boolean.
 */
function resolveForSize(
  entries: ActionsEntry[],
  size: DataTableToolbarProps["size"]
) {
  const resolve = (action: Action): Action =>
    action.standalone === "desktop"
      ? ({ ...action, standalone: size !== "sm" } as Action)
      : action

  return entries.map((entry) =>
    Array.isArray(entry) ? entry.map(resolve) : resolve(entry)
  )
}

// DECISION: at `sm` the first two view controls stay (Filters, View options), the rest go to
// "⋯" — position, not key, so a consumer's own view controls follow the same rule.
/**
 * At `sm` the view cluster keeps its first two controls — Filters and View options — and the rest
 * move to the head of the "⋯" menu, in their own group.
 */
function splitView(
  entries: ActionsEntry[],
  size: DataTableToolbarProps["size"]
) {
  if (size !== "sm") return { kept: entries, moved: [] as Action[] }

  const flat = entries.flatMap((entry) =>
    Array.isArray(entry) ? entry : [entry]
  )
  const visible = flat.filter((action) => !action.hidden)

  return {
    kept: visible.slice(0, 2) as ActionsEntry[],
    moved: visible
      .slice(2)
      .map((action) => ({ ...action, standalone: false }) as Action),
  }
}

/**
 * The first `limit` actions that can be buttons become buttons, the rest menu rows. An action that
 * says `standalone: false` stays in the menu and does not use up the budget; one that cannot be a
 * menu row (a popover panel) stays a button whatever the count.
 */
function capVisible(entries: ActionsEntry[], limit: number): ActionsEntry[] {
  let budget = limit

  const cap = (action: Action): Action => {
    if (action.hidden || action.standalone === false) return action

    // A menu action that runs something on its own click (a split button) cannot become a
    // menu row; it stays a button and does not count.
    if ("menuItems" in action && action.menuItems && action.onClick)
      return action

    if (budget > 0) {
      budget -= 1
      return { ...action, standalone: true } as Action
    }

    return { ...action, standalone: false } as Action
  }

  return entries.map((entry) =>
    Array.isArray(entry) ? entry.map(cap) : cap(entry)
  )
}

function DataTableToolbar({
  actions = [],
  rightActions = [],
  search,
  maxVisibleActions = DEFAULT_MAX_VISIBLE_ACTIONS,
  size = "lg",
  className,
}: DataTableToolbarProps) {
  const view = React.useMemo(
    () => splitView(resolveForSize(rightActions, size), size),
    [rightActions, size]
  )
  const capped = React.useMemo(() => {
    const own = capVisible(
      resolveForSize(actions, size),
      budgetFor(size, maxVisibleActions)
    )

    return view.moved.length > 0 ? [view.moved, ...own] : own
  }, [actions, size, maxVisibleActions, view.moved])
  const confirmable = useActionConfirmation(capped as DataTableActionEntry[])
  const messages = useTableMessages()

  // Nothing to show is not an empty bar — it is no bar, and no gap where one would have been.
  if (actions.length === 0 && rightActions.length === 0 && !search) {
    return null
  }

  return (
    <div
      data-slot="toolbar"
      data-size={size}
      className={cn(
        "group/toolbar flex min-h-14 flex-wrap items-center gap-2 px-4 py-2",
        className
      )}
    >
      {/* Rendered ONCE. A second copy behind a breakpoint would be a second search box in
                the DOM, with its own draft and its own debounce. */}
      {search ? (
        <div
          data-slot="toolbar-search"
          className="flex min-w-0 flex-[0_1_20rem] *:w-full group-data-[size=sm]/toolbar:flex-[1_1_100%]"
        >
          {search}
        </div>
      ) : null}

      {view.kept.length > 0 ? (
        <div data-slot="toolbar-view" className="flex items-center gap-2">
          <Actions
            asGroup={false}
            size="default"
            actions={view.kept}
            triggerLabel={messages.toolbar.options}
          />
        </div>
      ) : null}

      <span data-slot="toolbar-spacer" className="flex-1" />

      {capped.length > 0 ? (
        <div
          data-slot="toolbar-actions"
          className="flex items-center gap-2"
          role="group"
          aria-label={messages.toolbar.actions}
        >
          {/* `asGroup={false}`: these are separate things to do, not variations on one,
                        so they keep their own edges instead of being welded into a segmented
                        control. */}
          <Actions
            asGroup={false}
            size="default"
            variant="outline"
            actions={confirmable.actions as ActionsEntry[]}
            triggerLabel={messages.toolbar.moreActions}
            triggerTooltip={messages.toolbar.moreActionsTooltip}
            trigger={
              <Button
                variant="outline"
                size="icon"
                icon="more-horizontal"
                aria-label={messages.toolbar.moreActions}
              />
            }
          />
          {confirmable.dialog}
        </div>
      ) : null}
    </div>
  )
}

export { DataTableToolbar }
