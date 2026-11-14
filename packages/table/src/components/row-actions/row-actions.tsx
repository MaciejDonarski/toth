import * as React from "react"

import { Dialog } from "@toth/ui/components/dialog"

import { useTableMessages } from "../../hooks/use-table-locale"
import {
  Actions,
  resolveActionStandalone,
  type Action,
  type ActionsEntry,
  type ActionStandalone,
} from "../../internal/actions"
import type { ButtonSize, ButtonVariant } from "../../internal/button"
import {
  ConfirmationDialogContent,
  DeleteDialogContent,
} from "../../internal/confirmation-dialog"
import type { IconSource } from "../../internal/icon"
import type { DataTableActionConfirm } from "../data-table/data-table.types"
import type { PlainTableCellProps } from "../plain-table/types"

// The trailing cell of every row: what can be done to that row, behind one three-dots trigger.
//
// The descriptors are declared ONCE for the table and resolved per row, so a caller writes
// `disabled: (row) => row.locked` rather than rebuilding an action array for each of 500 rows. As
// with the selection cells, the list arrives through context so the synthetic actions column can be
// a module-level constant.

/** Anything about an action that can depend on the row it belongs to. */
type PerRow<TRow, TValue> = TValue | ((row: TRow) => TValue)

export interface DataTableRowAction<TRow> {
  label: PerRow<TRow, React.ReactNode>
  key?: React.Key
  icon?: IconSource
  /** Where the action goes. Ignored when `render` is given. */
  href?: PerRow<TRow, string>
  /** What the action runs. An action navigates or acts — one that does both is two actions. */
  onClick?: (row: TRow) => void
  /**
   * The element to render as, for an app's own router link: `(row) => <Link to={…} />`.
   *
   * A function of the row rather than an element, because the target is per row — which is the
   * whole difference between this and a toolbar `Action`.
   */
  render?: (row: TRow) => React.ReactElement
  variant?: ButtonVariant
  disabled?: PerRow<TRow, boolean>
  /** Dropped entirely for rows it does not apply to. */
  hidden?: PerRow<TRow, boolean>
  loading?: PerRow<TRow, boolean>
  /**
   * Promoted out of the menu to a button in the cell, and the actions column widens to fit it.
   * Costs that width in every row — use sparingly; `'desktop'` gives it back below the `md`
   * breakpoint, where a row of buttons has no room.
   *
   * Requires an `icon`, unless `size` says otherwise. The cell draws its controls at `icon-sm`, a
   * 28px square with no room for a label, so an action with nothing to draw in it stays a menu row.
   */
  standalone?: ActionStandalone
  /**
   * Standalone actions only — a menu row has one size. Overrides the cell's default `icon-sm`.
   *
   * A non-icon size (`'sm'`, `'default'`, …) draws the label beside the icon instead of hiding it,
   * but its width then depends on that label's text, which cannot be computed the way a 28px
   * square can — the actions column cannot size itself for it. Pass `rowActionsColumnWidth` on the
   * table alongside this.
   */
  size?: ButtonSize
  title?: string
  /**
   * Ask before running `onClick`. The dialog is the table's one shared confirmation dialog, so a
   * 500-row table mounts one, not 500. A `variant: 'destructive'` action gets the destructive
   * dialog (red confirm), anything else the plain one. A function of the row, so the question can
   * name it: "Delete Anna Kowalska?".
   */
  confirm?: PerRow<TRow, DataTableActionConfirm>
}

/** One action, or a nested array of them — nesting draws a separator, as in `Actions`. */
export type DataTableRowActionEntry<TRow> =
  DataTableRowAction<TRow> | DataTableRowAction<TRow>[]

function resolve<TRow, TValue>(
  value: PerRow<TRow, TValue> | undefined,
  row: TRow
) {
  return typeof value === "function"
    ? (value as (row: TRow) => TValue)(row)
    : value
}

/** Whether a size draws a square with no room for a label — the cell's own default, `icon-sm`. */
function isIconSize(size: ButtonSize | undefined) {
  return size === undefined || size === "icon" || size.startsWith("icon-")
}

/**
 * Whether an action may become a button at all.
 *
 * At the cell's default size every control is a 28px square, and `Actions` only omits the label
 * inside one when there is an icon to draw instead — without one the label would be rendered into a
 * box it cannot fit. An action that asks for a bigger `size` draws its label regardless, so it needs
 * no icon to be promotable; refusing the icon-less default keeps the column's arithmetic honest, and
 * the two questions below (this one, and whether the width is even knowable) agree with the DOM
 * because both ask it the same way.
 */
function isPromotable<TRow>(action: DataTableRowAction<TRow>) {
  return !isIconSize(action.size) || action.icon !== undefined
}

/**
 * Whether a promoted action's width cannot be worked out in advance.
 *
 * A 28px square is exact; a button sized for a label is only as wide as that label's text, which is
 * not something this table can measure — column widths here are authoritative, not measured. Reach
 * for `rowActionsColumnWidth` on the table when this is true for anything that survives promotion.
 */
function hasUnmeasurableWidth<TRow>(action: DataTableRowAction<TRow>) {
  return !isIconSize(action.size)
}

/** Every action, with the nesting that only ever meant "draw a separator here" flattened away. */
function flatten<TRow>(entries: readonly DataTableRowActionEntry<TRow>[]) {
  return entries.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
}

/**
 * How many controls the widest row of this cell holds — the promoted buttons, plus the three-dots
 * trigger when anything is left for the menu. What the actions column is sized from.
 *
 * Two things are decided per row and cannot be here, because a column is one width all the way down:
 *
 * - a `hidden` FUNCTION still reserves its width. Only a static `hidden: true` is dropped, because
 *   only that one is true of every row;
 * - `Actions` drops the trigger for a row whose menu came out empty. The widest row is the one where
 *   it did not, so the trigger is counted whenever any action could land in the menu.
 */
function countRowActionControls<TRow>(
  entries: readonly DataTableRowActionEntry<TRow>[],
  isMobile: boolean
): number {
  const actions = flatten(entries).filter((action) => action.hidden !== true)

  const standalone = actions.filter(
    (action) =>
      isPromotable(action) &&
      resolveActionStandalone(action.standalone, isMobile)
  ).length

  const hasMenu = standalone < actions.length

  return standalone + (hasMenu ? 1 : 0)
}

/** A confirmation waiting on the user: what to ask, and what to run on yes. */
interface PendingConfirmation {
  confirm: DataTableActionConfirm
  destructive: boolean
  run: () => void
}

type AskConfirmation = (pending: PendingConfirmation) => void

/** One row's descriptors, flattened into what `Actions` takes. */
function resolveRowActions<TRow>(
  entries: readonly DataTableRowActionEntry<TRow>[],
  row: TRow,
  ask?: AskConfirmation
): ActionsEntry[] {
  const resolveOnClick = (action: DataTableRowAction<TRow>) => {
    const onClick = action.onClick
    if (!onClick) return undefined

    const confirm = resolve(action.confirm, row)
    if (!confirm || !ask) return () => onClick(row)

    return () =>
      ask({
        confirm,
        destructive: action.variant === "destructive",
        run: () => onClick(row),
      })
  }

  const resolveOne = (action: DataTableRowAction<TRow>): Action => ({
    label: resolve(action.label, row),
    key: action.key,
    icon: action.icon,
    href: resolve(action.href, row),
    render: action.render?.(row),
    variant: action.variant,
    disabled: resolve(action.disabled, row),
    hidden: resolve(action.hidden, row),
    loading: resolve(action.loading, row),
    // Dropped rather than passed on when the action has no icon, so what is drawn matches what
    // `countRowActionControls` reserved room for.
    standalone: isPromotable(action) ? action.standalone : undefined,
    size: action.size,
    title: action.title,
    onClick: resolveOnClick(action),
  })

  return entries.map((entry) =>
    Array.isArray(entry) ? entry.map(resolveOne) : resolveOne(entry)
  )
}

export interface RowActionsContextValue {
  /**
   * The descriptors, as declared for the table.
   *
   * `unknown` for the row for the same reason the selection context uses it: a module-level cell
   * component cannot read a generic context. The table puts its own typed list in here and every
   * row handed back out came from that same table.
   */
  actions: readonly DataTableRowActionEntry<unknown>[]
}

const RowActionsContext = React.createContext<RowActionsContextValue | null>(
  null
)

const RowConfirmationContext = React.createContext<AskConfirmation | null>(null)

/**
 * Makes the row actions available to the cells in the actions column, and owns the one dialog
 * every row's `confirm` opens.
 */
function DataTableRowActionsProvider({
  value,
  children,
}: {
  value: RowActionsContextValue
  children: React.ReactNode
}) {
  const [pending, setPending] = React.useState<PendingConfirmation | null>(null)
  const [open, setOpen] = React.useState(false)

  const ask = React.useCallback((next: PendingConfirmation) => {
    setPending(next)
    setOpen(true)
  }, [])

  const Content = pending?.destructive
    ? DeleteDialogContent
    : ConfirmationDialogContent

  return (
    <RowActionsContext value={value}>
      <RowConfirmationContext value={ask}>
        {children}
        {/* Stays mounted with its last question while it animates out; only `open` changes. */}
        <Dialog open={open} onOpenChange={setOpen}>
          {pending ? (
            <Content
              title={pending.confirm.title}
              description={pending.confirm.description}
              confirmLabel={pending.confirm.confirmLabel}
              cancelLabel={pending.confirm.cancelLabel}
              onConfirm={() => {
                setOpen(false)
                pending.run()
              }}
            />
          ) : null}
        </Dialog>
      </RowConfirmationContext>
    </RowActionsContext>
  )
}

/**
 * One row's actions.
 *
 * `asGroup={false}` because the cell holds one control most of the time and a welded group of one
 * is just a button with extra rules. Everything lands in the menu unless a descriptor asks
 * otherwise: a row of buttons in every row of a 500-row table costs more width than any of them is
 * worth, so the default is one trigger and the column is as narrow as that.
 *
 * When a descriptor does ask, the column widens for it — `countRowActionControls` above is how, and
 * the two have to stay in step, which is why both go through `isPromotable`.
 */
function DataTableRowActionsCell<TRow>({ row }: PlainTableCellProps<TRow>) {
  const context = React.use(RowActionsContext)
  const ask = React.use(RowConfirmationContext) ?? undefined
  const messages = useTableMessages()

  if (!context || context.actions.length === 0) {
    return null
  }

  return (
    <Actions
      asGroup={true}
      size="icon-sm"
      variant="ghost"
      triggerLabel={messages.rowActions.trigger}
      actions={resolveRowActions(context.actions, row as unknown, ask)}
    />
  )
}

export {
  countRowActionControls,
  DataTableRowActionsCell,
  DataTableRowActionsProvider,
  hasUnmeasurableWidth,
  isPromotable,
  resolveRowActions,
}
