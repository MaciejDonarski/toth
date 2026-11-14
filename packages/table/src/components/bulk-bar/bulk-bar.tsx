import * as React from "react"

import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Actions, type ActionsEntry } from "../../internal/actions"
import { Button } from "../../internal/button"
import type {
  DataTableAction,
  DataTableActionEntry,
} from "../data-table/data-table.types"
import { useActionConfirmation } from "./action-confirmation"

// What replaces the toolbar while rows are selected: how many, a way to widen the selection to
// everything that matches, a way out, and what can be done to them.
//
// It replaces the toolbar rather than sitting above it because the two answer different questions —
// "what am I looking at" and "what am I doing to these" — and while a selection is held the second
// is the one that matters. A primary tint with a rail down the leading edge ties it to the selected
// rows, which carry the same rail.

export interface DataTableBulkBarProps {
  /** How many rows the selection covers. */
  selectedCount: number
  /** How many rows match, for "Select all N matching". */
  totalCount?: number
  /** Whether "Select all N matching" is on offer at all. */
  canSelectAll?: boolean
  isAllSelected?: boolean
  onSelectAll?: () => void
  /** Clears the selection — the Clear link and the close button. */
  onClear: () => void
  /** What can be done to the selection. A `confirm` on an action asks before it runs. */
  actions?: DataTableActionEntry[]
  /**
   * A phone-sized window: the bar docks to the bottom of the screen above the content, the
   * toolbar stays where it was, the actions shrink to icons, and the destructive ones go into the
   * "⋯" menu together with `selectionChoices`.
   */
  docked?: boolean
  /** The header chevron's four choices, for the docked bar's menu — there is no header to reach. */
  selectionChoices?: DataTableActionEntry[]
  className?: string
}

const NO_ACTIONS: DataTableActionEntry[] = []

function asButton(action: DataTableAction): DataTableAction {
  return action.standalone === undefined
    ? { ...action, standalone: true }
    : action
}

function DataTableBulkBar({
  selectedCount,
  totalCount,
  canSelectAll = false,
  isAllSelected = false,
  onSelectAll,
  onClear,
  actions = NO_ACTIONS,
  docked = false,
  selectionChoices = NO_ACTIONS,
  className,
}: DataTableBulkBarProps) {
  // DECISION: bulk actions default to `standalone: true` (the prototype shows them all).
  // A selection is acted on, so its actions are buttons unless one says otherwise — the menu is
  // where a toolbar keeps what it seldom needs, and nothing here is seldom.
  const promoted = React.useMemo((): DataTableActionEntry[] => {
    if (!docked) {
      return actions.map((entry) =>
        Array.isArray(entry) ? entry.map(asButton) : asButton(entry)
      )
    }

    // Docked: room for a few icons. A destructive action is never one tap from the thumb — it
    // goes to the menu, behind the selection choices.
    const asIcon = (action: DataTableAction): DataTableAction =>
      action.variant === "destructive"
        ? { ...action, standalone: false }
        : ({ ...asButton(action), size: "icon" } as DataTableAction)
    const own = actions.map((entry) =>
      Array.isArray(entry) ? entry.map(asIcon) : asIcon(entry)
    )
    // One group of their own, so a separator sets them off from the selection's actions.
    const choices: DataTableAction[] = selectionChoices
      .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
      .map((action) => ({ ...action, standalone: false }))

    return choices.length > 0 ? [choices, ...own] : own
  }, [actions, docked, selectionChoices])
  const confirmable = useActionConfirmation(promoted)
  const messages = useTableMessages()

  const bar = (
    <div
      data-slot="bulk-bar"
      data-docked={docked || undefined}
      role="region"
      aria-label={messages.bulk.label}
      className={cn(
        "group/bulk flex min-h-14 flex-wrap items-center gap-2 bg-primary/5 px-4 py-2 shadow-[inset_3px_0_0_var(--color-primary)]",
        // Docked on a phone: floating above the foot of the screen, clear of the home indicator.
        "data-docked:fixed data-docked:inset-x-2 data-docked:bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] data-docked:z-50 data-docked:min-h-0 data-docked:flex-nowrap data-docked:gap-1 data-docked:rounded-lg data-docked:border data-docked:border-primary/20 data-docked:bg-background data-docked:py-1 data-docked:pr-1 data-docked:pl-4 data-docked:shadow-[inset_3px_0_0_var(--color-primary),0_10px_30px_-10px_rgb(0_0_0/0.3)]",
        className
      )}
    >
      {/* A live region of its own, so every tick is announced as the new count. */}
      <span
        className="font-semibold whitespace-nowrap text-primary tabular-nums group-data-docked/bulk:mr-auto"
        aria-live="polite"
      >
        {messages.bulk.selected(selectedCount)}
      </span>

      {!docked && canSelectAll && !isAllSelected && onSelectAll ? (
        <Button
          variant="link"
          size="sm"
          data-slot="bulk-bar-select-all"
          className="whitespace-nowrap"
          onClick={onSelectAll}
        >
          {totalCount !== undefined
            ? messages.bulk.selectAllMatching(totalCount)
            : messages.bulk.selectAll}
        </Button>
      ) : null}

      {docked ? null : (
        <Button
          variant="link"
          size="sm"
          data-slot="bulk-bar-clear"
          className="whitespace-nowrap"
          onClick={onClear}
        >
          {messages.bulk.clearLink}
        </Button>
      )}

      {confirmable.actions.length > 0 ? (
        <>
          {docked ? null : (
            <span className="h-6 w-px bg-primary/30" aria-hidden="true" />
          )}
          <Actions
            asGroup={false}
            size="default"
            variant="outline"
            actions={confirmable.actions as ActionsEntry[]}
            triggerLabel={messages.bulk.moreActions}
            triggerTooltip={messages.toolbar.moreActionsTooltip}
            trigger={
              <Button
                variant="outline"
                size="icon"
                icon="more-horizontal"
                aria-label={messages.bulk.moreActions}
              />
            }
            className="flex-wrap"
          />
        </>
      ) : null}

      <span className="flex-1 group-data-docked/bulk:hidden" />

      <Button
        variant="ghost"
        size="icon"
        icon="x"
        aria-label={messages.bulk.clear}
        className="shrink-0"
        onClick={onClear}
      />

      {confirmable.dialog}
    </div>
  )

  // Docked, the bar floats over the end of the page, so the page gets the same room back at its
  // foot — otherwise the last rows and the pager would sit under it.
  return docked ? (
    <>
      {bar}
      <div className="h-22" aria-hidden="true" />
    </>
  ) : (
    bar
  )
}

export { DataTableBulkBar }
