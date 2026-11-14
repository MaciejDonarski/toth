import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@toth/ui/components/dropdown-menu"
import { Skeleton } from "@toth/ui/components/skeleton"
import { useIsMobile } from "../../internal/hooks/use-is-mobile"
import { cn } from "@toth/ui/lib/utils"

import { useRegisterTableScope } from "../../hooks/use-register-table-scope"
import { useTableMessages } from "../../hooks/use-table-locale"
import { Button } from "../../internal/button"
import { useSizeStep } from "../../internal/hooks/use-size-step"
import { Icon, type IconSource } from "../../internal/icon"
import { IconButton } from "../../internal/icon-button"
import type { TableMessages } from "../../lib/messages"
import { emitChange } from "../../lib/table-registry"

import { columnTypeCell } from "./column-types"
import type { PlainTableSize } from "./constants"
import {
  DEFAULT_PLACEHOLDER_ROWS,
  DEFAULT_STORAGE_KEY,
  PLAIN_TABLE_SIZE_STEPS,
} from "./constants"
import type { UseColumnAlignOptions, UseResizableColumnsOptions } from "./hooks"
import { useColumnAlign, useResizableColumns, useStickyColumns } from "./hooks"
import type {
  PlainTableAlignButtonProps,
  PlainTableCellProps,
  PlainTableColumn,
  PlainTableColumnAlign,
  PlainTableColumnMenuGroup,
  PlainTableColumnMenuItem,
  PlainTableDragPreviewProps,
  PlainTableErrorProps,
  PlainTableFooterProps,
  PlainTableHandle,
  PlainTableHeaderCellLabelProps,
  PlainTableHeaderCellProps,
  PlainTableHeaderProps,
  PlainTableLoaderProps,
  PlainTableNoDataProps,
  PlainTableResizeHandleProps,
  PlainTableRowData,
  PlainTableSlotProps,
  PlainTableSlots,
  PlainTableStickyProps,
} from "./types"

// A scrollable data table with resizable, alignable and pinnable columns. It renders rows it is
// given; sorting, paging and fetching belong to whatever owns the data.
//
// Every visible part is replaceable through `slots`, and every replacement is typed against the
// same props the built-in receives — the map in `types.ts` defines both sides at once. The old
// component had ten `xxxComponent` props paired with ten untyped `xxxProps` bags instead.

// ===================== styles =====================
//
// Tailwind classes on the elements themselves. What a composing table (`DataTable`'s compact
// density, its selected-row highlight, column dividers) adjusts goes through custom properties
// rather than class names, so it never has to name a class that belongs to this file:
//
//   --plain-table-row-height, --plain-table-header-height, --plain-table-cell-padding-inline,
//   --plain-table-row-bg, --plain-table-row-hover-bg, --plain-table-column-divider,
//   --plain-table-header-divider, --plain-table-resize-line, and --plain-table-sticky-offset,
//   which React sets on a pinned cell.
//
// Pinning only applies where the TABLE is wide enough for it: the wrapper carries `data-pinning`
// from `md` up (measured on the wrapper, not the window), and that attribute is the single place
// the decision is made — the offsets are set unconditionally.

/** What every pinned cell shares: sticky from `md` up, offset by its side, with a seam on the edge. */
const STICKY_CELL =
  "group-data-pinning/plain-table:data-sticky:sticky group-data-pinning/plain-table:data-[sticky=left]:left-(--plain-table-sticky-offset,0) group-data-pinning/plain-table:data-[sticky=right]:right-(--plain-table-sticky-offset,0) group-data-pinning/plain-table:data-sticky-end:after:absolute group-data-pinning/plain-table:data-sticky-end:after:inset-y-0 group-data-pinning/plain-table:data-sticky-end:after:w-px group-data-pinning/plain-table:data-sticky-end:after:bg-border group-data-pinning/plain-table:data-[sticky=left]:data-sticky-end:after:right-0 group-data-pinning/plain-table:data-[sticky=left]:data-sticky-end:after:shadow-[2px_0_4px_0_rgb(0_0_0/0.08)] group-data-pinning/plain-table:data-[sticky=right]:data-sticky-end:after:left-0 group-data-pinning/plain-table:data-[sticky=right]:data-sticky-end:after:shadow-[-2px_0_4px_0_rgb(0_0_0/0.08)]"

/** Alignment of a body or footer cell; a right-aligned column is numbers, compared digit by digit. */
const ALIGNED_CELL =
  "text-left data-[align=center]:text-center data-[align=right]:text-right data-[align=right]:tabular-nums"

/**
 * A header cell: a sticky, opaque band — opaque so the rows scroll under it rather than through
 * it, and the background on the cell itself so its padding is covered too.
 */
const HEADER_CELL_CLASS = cn(
  "group/th sticky top-0 z-2 border-b bg-muted px-(--plain-table-cell-padding-inline,0.75rem) text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground not-last:border-r not-last:border-r-(--plain-table-header-divider,transparent) group-data-pinning/plain-table:data-sticky:z-3",
  STICKY_CELL
)

/**
 * A body cell. Opaque for the same reason a header cell is; the rule between rows separates them
 * without ruling the table into a grid, and the vertical rule is always there, transparent unless
 * `--plain-table-column-divider` colours it — so dividers never shift a column by a pixel.
 */
const BODY_CELL_CLASS = cn(
  "overflow-hidden border-b bg-(--plain-table-row-bg,var(--color-background)) px-(--plain-table-cell-padding-inline,0.75rem) align-middle text-sm text-ellipsis whitespace-nowrap transition-colors not-last:border-r not-last:border-r-(--plain-table-column-divider,transparent) group-hover/row:bg-(--plain-table-row-hover-bg,color-mix(in_oklch,var(--color-muted)_60%,var(--color-background))) group-data-pinning/plain-table:data-sticky:z-1",
  ALIGNED_CELL,
  STICKY_CELL
)

/** A totals cell: stuck to the bottom of the scroll area the way the header is stuck to its top. */
const FOOTER_CELL_CLASS = cn(
  "sticky bottom-0 z-2 h-(--plain-table-row-height,2.5rem) overflow-hidden border-t bg-muted px-(--plain-table-cell-padding-inline,0.75rem) text-sm font-semibold text-ellipsis whitespace-nowrap group-data-pinning/plain-table:data-sticky:z-3",
  ALIGNED_CELL,
  STICKY_CELL
)

const ROW_CLASS = "group/row h-(--plain-table-row-height,2.5rem)"

// Hoisted so the defaults keep one identity across renders. Inline `[]` / `{}` / `() => ''`
// defaults would be new values on every render and would defeat the memoized rows below.
const EMPTY_COLUMNS: PlainTableColumn<never>[] = []
const EMPTY_ROWS: never[] = []
const EMPTY_SLOTS: PlainTableSlots<never> = {}
const EMPTY_SLOT_PROPS: PlainTableSlotProps<never> = {}
const EMPTY_OPTIONS = {}
const noClassName = () => ""
const NO_MENU: PlainTableColumnMenuGroup[] = []
// Module scope, so the default is one stable identity rather than a new object per render.
const noProps = () => ({})
const defaultGetRowId = (row: PlainTableRowData, index: number): React.Key =>
  (row?.id as React.Key) ?? index

/**
 * A truncated cell's full text, as the native tooltip — decided when the pointer arrives.
 *
 * Whether a cell is cut off is a layout question, and answering it for every cell of every row on
 * every render, for the handful the pointer will ever visit, is the wrong trade. One delegated
 * listener on the body asks only about the cell under the pointer, and asks nothing of React: the
 * `title` is never a prop, so no render has an opinion about it and the memoised rows stay put.
 *
 * Only a cell holding plain text qualifies — a string or a number, however formatted. A cell with
 * elements in it is a template's, and a template has its own way of saying what it shows.
 */
function titleTruncatedCell(
  event: React.PointerEvent<HTMLTableSectionElement>
) {
  const cell = (event.target as Element | null)?.closest?.("td")

  if (
    !cell ||
    !event.currentTarget.contains(cell) ||
    cell.childElementCount > 0
  )
    return

  if (cell.scrollWidth > cell.clientWidth) {
    cell.title = cell.textContent ?? ""
  } else {
    cell.removeAttribute("title")
  }
}

/** A readable name for a column, for the controls' accessible labels. */
function columnName<TRow>(column: PlainTableColumn<TRow>): string {
  return typeof column.label === "string" ? column.label : column.id
}

// ===================== slot defaults =====================

/** The shape both the empty and the failed state share: a glyph in a circle, a title, a line, a way out. */
function PlainTableState({
  slot,
  tone,
  icon,
  title,
  text,
  action,
  className,
  ...props
}: {
  slot: string
  tone?: "destructive"
  icon: IconSource
  title: React.ReactNode
  text?: React.ReactNode
  action?: React.ReactNode
  className?: string
} & Pick<React.ComponentProps<"div">, "role">) {
  return (
    <div
      data-slot={slot}
      data-tone={tone}
      // Scaled for a table, not a page: a glyph in a circle, a title, a line and a way out,
      // centred in the space the rows would have taken.
      className={cn(
        "flex w-full flex-col items-center gap-2 px-4 py-8 text-center whitespace-normal",
        className
      )}
      {...props}
    >
      <span
        className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground in-data-[tone=destructive]:bg-destructive/10 in-data-[tone=destructive]:text-destructive [&_svg]:size-5"
        aria-hidden="true"
      >
        <Icon icon={icon} />
      </span>
      <div className="text-base font-semibold">{title}</div>
      {text ? (
        <p className="m-0 max-w-[34ch] text-sm text-pretty text-muted-foreground">
          {text}
        </p>
      ) : null}
      {action}
    </div>
  )
}

/**
 * Nothing to show — and WHICH nothing. A table narrowed to no rows says so and offers to clear the
 * filters; a table with no rows at all says it has none yet. The two used to read the same, "No
 * data", which sent people looking for data that a filter was hiding.
 */
function PlainTableNoData({
  className,
  message,
  description,
  hasFilters = false,
  onClearFilters,
  filteredMessage,
  filteredDescription,
}: PlainTableNoDataProps) {
  const messages = useTableMessages()

  if (hasFilters) {
    return (
      <PlainTableState
        slot="plain-table-no-data"
        className={className}
        icon="search-x"
        title={filteredMessage ?? messages.body.filteredEmpty}
        text={filteredDescription ?? messages.body.filteredEmptyDescription}
        action={
          onClearFilters ? (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              {messages.body.clearFilters}
            </Button>
          ) : null
        }
      />
    )
  }

  return (
    <PlainTableState
      slot="plain-table-no-data"
      className={className}
      icon="inbox"
      title={message ?? messages.body.empty}
      text={description}
    />
  )
}

// DECISION: "Your filters are kept." only when `hasFilters` — a plain table has none to keep.
/**
 * The failure state, shown in place of the rows: what went wrong, that the filters survived it,
 * and a way to try again.
 *
 * The old component had none: a caller whose fetch failed passed `rows={[]}` and the user read
 * "No data", which is a different thing and hides the retry.
 */
function PlainTableError({
  className,
  error,
  onRetry,
  title,
  hasFilters = false,
}: PlainTableErrorProps) {
  const messages = useTableMessages()

  return (
    <PlainTableState
      slot="plain-table-error"
      role="alert"
      tone="destructive"
      className={className}
      icon="circle-alert"
      title={title ?? messages.body.errorTitle}
      text={
        <>
          {error ?? messages.body.error}
          {hasFilters ? ` ${messages.body.filtersKept}` : null}
        </>
      }
      action={
        onRetry ? (
          <Button
            variant="outline"
            size="sm"
            icon="refresh-cw"
            data-slot="plain-table-error-retry"
            onClick={onRetry}
          >
            {messages.body.retry}
          </Button>
        ) : null
      }
    />
  )
}

/**
 * The refetch indicator: a thin bar travelling under the header while the rows stay on screen
 * dimmed. An indeterminate `progressbar` — no `aria-valuenow` — because how long a server takes is
 * not something the table knows.
 *
 * As tall as the header and pinned to the wrapper's top-left corner, with a negative margin that
 * gives the height back, so it takes no room in the flow; `overflow: hidden` keeps the travelling
 * bar from widening the scroll area. The travel is a Web Animation rather than a keyframe rule, so
 * the package ships no stylesheet; without motion the bar still says "loading", it just does not
 * move.
 */
function PlainTableLoader({ className }: PlainTableLoaderProps) {
  const messages = useTableMessages()
  const barRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const bar = barRef.current
    if (!bar || typeof bar.animate !== "function") return undefined
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return undefined
    }
    const animation = bar.animate(
      [{ transform: "translateX(-100%)" }, { transform: "translateX(400%)" }],
      { duration: 1100, iterations: Infinity, easing: "ease-in-out" }
    )
    return () => animation.cancel()
  }, [])

  return (
    <div
      data-slot="plain-table-loader"
      role="progressbar"
      aria-label={messages.body.loading}
      className={cn(
        "pointer-events-none sticky top-0 left-0 z-5 -mb-[calc(var(--plain-table-header-height,2.5rem)+1px)] h-[calc(var(--plain-table-header-height,2.5rem)+1px)] w-full overflow-hidden",
        className
      )}
    >
      <div
        ref={barRef}
        className="absolute bottom-0 left-0 h-0.5 w-[30%] bg-primary motion-reduce:w-full motion-reduce:opacity-60"
      />
    </div>
  )
}

/**
 * How wide one placeholder bar is, as a share of its cell: between 40% and 90%, varying by row and
 * column but the same on every render, so the first load reads as lines of text of different
 * lengths rather than as a grid of identical bars — and does not shimmer into new widths as it
 * re-renders.
 */
function placeholderWidth(rowIndex: number, columnIndex: number): string {
  return `${40 + ((rowIndex * 7 + columnIndex * 11) % 50)}%`
}

function PlainTableDragPreview({
  className,
  offset,
  height,
  limit,
}: PlainTableDragPreviewProps) {
  return (
    <div
      data-slot="plain-table-drag-preview"
      aria-hidden="true"
      data-limit={limit ?? undefined}
      // Where the column edge will land; red once the drag pushes past the column's own limits.
      className={cn(
        "pointer-events-none absolute top-0 z-5 w-0.5 bg-border data-limit:bg-destructive",
        className
      )}
      style={{ left: `${offset}px`, height: `${height}px` }}
    />
  )
}

function PlainTableHeaderCellLabel<TRow>({
  className,
  column,
}: PlainTableHeaderCellLabelProps<TRow>) {
  const { label, headerCellClassName } = column

  return (
    <span
      data-slot="plain-table-header-cell-label"
      className={cn(
        "min-w-0 truncate leading-tight",
        headerCellClassName,
        className
      )}
    >
      {typeof label === "function" ? label() : label}
    </span>
  )
}

/**
 * @deprecated Alignment moved into the column menu, as its Align section. Not drawn by default any
 * more; a caller who passes it as `slots.alignButton` still gets it, so a table that relied on the
 * button keeps it until the next major.
 */
function PlainTableAlignButton<TRow>({
  className,
  column,
  align,
  onAlignToggle,
}: PlainTableAlignButtonProps<TRow>) {
  const messages = useTableMessages()

  return (
    <IconButton
      size="icon-sm"
      variant="ghost"
      data-slot="plain-table-align-button"
      className={cn(
        "absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover/th:opacity-100 focus-visible:opacity-100",
        className
      )}
      onClick={() => onAlignToggle(column.id)}
      aria-label={messages.column.alignColumn(columnName(column), align)}
      icon={`align-${align}`}
      label={messages.column.align}
    />
  )
}

/**
 * The column's edge, as the thing that resizes it.
 *
 * A 9px strip straddling the boundary with a short hairline in the middle — the edge itself rather
 * than a grip icon parked inside the cell, so the label keeps the whole width and the affordance is
 * where a spreadsheet user already reaches for it. Hovered or focused, the hairline grows to the
 * full height in the primary colour.
 *
 * `role="separator"` with `tabIndex`: being focusable makes it a window splitter in ARIA's terms —
 * arrow keys resize, Home restores the default width — and one of those announces where it stands:
 * `aria-valuenow` is the column's width in px, between its `aria-valuemin` and `aria-valuemax`, all
 * three handed over with the handlers.
 */
function PlainTableResizeHandle<TRow>({
  className,
  column,
  ...handlers
}: PlainTableResizeHandleProps<TRow>) {
  const messages = useTableMessages()

  return (
    <div
      data-slot="plain-table-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={messages.column.resize(columnName(column))}
      // A focusable separator is ARIA's window splitter: arrow keys resize, Home resets.
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
      tabIndex={0}
      // The only gate on pointer resizing: hidden where nothing hovers or the pointer is coarse,
      // so the hook needs no media query of its own.
      className={cn(
        "absolute top-0 right-[calc(var(--plain-table-cell-padding-inline,0.75rem)*-1)] z-1 h-full w-[9px] cursor-col-resize touch-none outline-none after:absolute after:top-1/4 after:left-1 after:h-1/2 after:w-px after:bg-(--plain-table-resize-line,var(--color-border)) after:transition-all hover:after:top-0 hover:after:left-[3px] hover:after:h-full hover:after:w-0.5 hover:after:bg-primary focus-visible:after:top-0 focus-visible:after:left-[3px] focus-visible:after:h-full focus-visible:after:w-0.5 focus-visible:after:bg-primary pointer-coarse:hidden [@media(hover:none)]:hidden",
        className
      )}
      {...handlers}
    />
  )
}

/** One menu row, drawn as what it is: a checkable row when it carries state, a plain one when not. */
function ColumnMenuRow({ item }: { item: PlainTableColumnMenuItem }) {
  const content = (
    <>
      {item.icon ? <Icon icon={item.icon} /> : null}
      {item.label}
    </>
  )

  if (item.checked !== undefined) {
    return (
      // Closes like a plain row: a column menu is one decision, made and done, and a sort
      // applied behind a menu that stays open is a sort the user does not see happen.
      <DropdownMenuCheckboxItem
        closeOnClick
        checked={item.checked}
        disabled={item.disabled}
        onCheckedChange={() => item.onSelect()}
      >
        {content}
      </DropdownMenuCheckboxItem>
    )
  }

  return (
    <DropdownMenuItem
      variant={item.variant}
      disabled={item.disabled}
      onClick={() => item.onSelect()}
    >
      {content}
    </DropdownMenuItem>
  )
}

/**
 * The chevron beside a column's label, and the menu it opens: everything that can be done to the
 * column — sort it, align it, pin it, hide it — in one place rather than as a row of icons fighting
 * the label for the cell's width.
 *
 * Invisible until the header cell is hovered or the chevron is focused, so a resting header is just
 * its labels; always drawn where nothing hovers. Not drawn at all on a phone-sized window: there is
 * no hover to reveal it, a tap on the label already sorts, and hiding and reordering live in View
 * options.
 */
function PlainTableColumnMenu<TRow>({
  column,
  groups,
  className,
}: {
  column: PlainTableColumn<TRow>
  groups: PlainTableColumnMenuGroup[]
  className?: string
}) {
  const isMobile = useIsMobile()
  const messages = useTableMessages()

  if (isMobile || groups.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            data-slot="plain-table-column-menu-trigger"
            // Invisible until the header cell is hovered, the chevron focused or its menu open —
            // always drawn where nothing hovers.
            className={cn(
              "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-[opacity,background-color] outline-none group-hover/th:opacity-100 hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-background aria-expanded:text-foreground aria-expanded:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:opacity-100",
              className
            )}
            aria-label={messages.column.options(columnName(column))}
          >
            <Icon icon="chevron-down" className="size-3.5" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-52">
        {groups.map((group, index) => (
          <React.Fragment key={group.key}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            {group.radio ? (
              <DropdownMenuGroup>
                {group.label ? (
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                ) : null}
                <DropdownMenuRadioGroup
                  value={group.items.find((item) => item.checked)?.key ?? ""}
                  onValueChange={(value) =>
                    group.items.find((item) => item.key === value)?.onSelect()
                  }
                >
                  {group.items.map((item) => (
                    <DropdownMenuRadioItem
                      closeOnClick
                      key={item.key}
                      value={item.key}
                      disabled={item.disabled}
                    >
                      {item.icon ? <Icon icon={item.icon} /> : null}
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            ) : (
              <DropdownMenuGroup>
                {group.label ? (
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                ) : null}
                {group.items.map((item) => (
                  <ColumnMenuRow key={item.key} item={item} />
                ))}
              </DropdownMenuGroup>
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const ALIGN_OPTIONS = [
  { align: "left", label: "alignLeft", icon: "align-left" },
  { align: "center", label: "alignCenter", icon: "align-center" },
  { align: "right", label: "alignRight", icon: "align-right" },
] as const

/** What `PlainTable` offers in a column's menu on its own: the Align section. */
function alignMenuGroup<TRow>(
  column: PlainTableColumn<TRow>,
  align: PlainTableColumnAlign,
  onAlignChange: (columnId: string, align: PlainTableColumnAlign) => void,
  messages: TableMessages
): PlainTableColumnMenuGroup {
  return {
    key: "align",
    label: messages.column.align,
    radio: true,
    items: ALIGN_OPTIONS.map((option) => ({
      key: option.align,
      label: messages.column[option.label],
      icon: option.icon,
      checked: align === option.align,
      onSelect: () => onAlignChange(column.id, option.align),
    })),
  }
}

function PlainTableHeaderCell<TRow>({
  className,
  column,
  align,
  isEmpty,
  slots,
  slotProps,
  onAlignToggle,
  getResizeHandlers,
  menu = NO_MENU,
}: PlainTableHeaderCellProps<TRow>) {
  const { isAlignable = true, isResizable = false } = column

  const Label = slots.headerCellLabel ?? PlainTableHeaderCellLabel
  const ResizeHandle = slots.resizeHandle ?? PlainTableResizeHandle
  // Only a caller's own: the default header aligns through the column menu now.
  const AlignButton = slots.alignButton

  return (
    <div
      data-slot="plain-table-header-cell-content"
      data-alignable={isAlignable ? "" : undefined}
      // Label, then the menu chevron beside it. A right-aligned column mirrors the pair: the label
      // stays against the edge its numbers are on, the chevron moves to its left.
      className={cn(
        "relative flex h-(--plain-table-header-height,2.5rem) flex-row items-center justify-start gap-0.5 in-data-[align=center]:justify-center in-data-[align=right]:flex-row-reverse",
        className
      )}
    >
      <Label {...slotProps.headerCellLabel} column={column} />
      <PlainTableColumnMenu column={column} groups={menu} />
      {AlignButton && isAlignable && !isEmpty ? (
        <AlignButton
          {...slotProps.alignButton}
          column={column}
          align={align}
          onAlignToggle={onAlignToggle}
        />
      ) : null}
      {isResizable && !isEmpty ? (
        <ResizeHandle
          {...slotProps.resizeHandle}
          column={column}
          {...getResizeHandlers(column.id)}
        />
      ) : null}
    </div>
  )
}

function PlainTableHeader<TRow>({
  className,
  rowClassName,
  cellClassName,
  columns,
  isEmpty,
  slots,
  slotProps,
  getAlign,
  getStickyProps,
  onAlignToggle,
  onAlignChange,
  getResizeHandlers,
  getColumnMenuItems,
  getHeaderCellClassName = noClassName,
  getHeaderCellProps = noProps,
}: PlainTableHeaderProps<TRow>) {
  const HeaderCell = slots.headerCell ?? PlainTableHeaderCell
  const messages = useTableMessages()

  return (
    // `<thead>`, its `<tr>` and `<tbody>` carry no class of their own: everything visible is
    // painted by the cells, because a pinned cell has to be opaque and a background on the
    // section or the row does not show through one. `data-slot` is the hook for the rest.
    <thead data-slot="plain-table-header" className={className}>
      <tr data-slot="plain-table-header-row" className={rowClassName}>
        {columns.map((column, columnIndex) => {
          const align = getAlign(column.id)
          // With no rows there is nothing to align; an alignable column of a table with
          // rows offers it, and whoever composed the table decides what goes around it.
          const defaults =
            onAlignChange && column.isAlignable !== false && !isEmpty
              ? [alignMenuGroup(column, align, onAlignChange, messages)]
              : NO_MENU
          const menu = (
            getColumnMenuItems ? getColumnMenuItems(column, defaults) : defaults
          ).filter((group) => group.items.length > 0)

          return (
            <th
              key={column.id}
              // First, so the cell's own attributes below cannot be taken away
              // from it — see `getHeaderCellProps`.
              {...getHeaderCellProps(column)}
              scope="col"
              data-id={column.id}
              data-align={align}
              className={cn(
                HEADER_CELL_CLASS,
                cellClassName,
                getHeaderCellClassName(column)
              )}
              {...getStickyProps(columnIndex)}
            >
              <HeaderCell
                {...slotProps.headerCell}
                column={column}
                align={align}
                isEmpty={isEmpty}
                slots={slots}
                slotProps={slotProps}
                onAlignToggle={onAlignToggle}
                getResizeHandlers={getResizeHandlers}
                menu={menu}
              />
            </th>
          )
        })}
      </tr>
    </thead>
  )
}

/**
 * The totals row: drawn when any column declares a `footer`, stuck to the bottom of the scroll area
 * so the sums stay in view however long the list. A column without one gets an empty cell, so the
 * row still lines up with the columns above it.
 */
function PlainTableFooter<TRow>({
  columns,
  rows = EMPTY_ROWS as TRow[],
  getAlign,
  getStickyProps,
  className,
}: PlainTableFooterProps<TRow>) {
  if (rows.length === 0 || !columns.some((column) => column.footer)) return null

  return (
    <tfoot data-slot="plain-table-footer" className={className}>
      <tr>
        {columns.map((column, columnIndex) => (
          <td
            key={column.id}
            data-id={column.id}
            data-align={getAlign?.(column.id)}
            className={FOOTER_CELL_CLASS}
            {...getStickyProps?.(columnIndex)}
          >
            {column.footer?.(rows)}
          </td>
        ))}
      </tr>
    </tfoot>
  )
}

/**
 * The default cell: the row's value for this column, as text.
 *
 * Anything React cannot render is stringified rather than thrown away, so an object in a column
 * shows up as `[object Object]` — visible, and a prompt to give the column a `template`.
 */
function PlainTableCellContent<TRow>({
  row,
  column,
}: PlainTableCellProps<TRow>) {
  const value = (row as PlainTableRowData)?.[column.id]

  if (value == null) return null
  if (typeof value === "string" || typeof value === "number")
    return <>{value}</>
  if (React.isValidElement(value)) return value

  return <>{String(value)}</>
}

// ===================== rows =====================

interface RowProps<TRow> {
  row: TRow
  rowIndex: number
  columns: PlainTableColumn<TRow>[]
  cellComponent: React.ComponentType<PlainTableCellProps<TRow>>
  cellProps: Partial<PlainTableCellProps<TRow>> | undefined
  className?: string
  extraClassName?: string
  /** `aria-selected` on the `<tr>`. Absent, the row carries no attribute at all. */
  selected?: boolean
  cellClassName?: string
  getAlign: (columnId: string) => string
  getStickyProps: (columnIndex: number) => PlainTableStickyProps
  getCellClassName: (
    row: TRow,
    rowIndex: number,
    column: PlainTableColumn<TRow>,
    columnIndex: number
  ) => string
}

function RowImpl<TRow>({
  row,
  rowIndex,
  columns,
  cellComponent,
  cellProps,
  className,
  extraClassName,
  selected,
  cellClassName,
  getAlign,
  getStickyProps,
  getCellClassName,
}: RowProps<TRow>) {
  return (
    <tr
      aria-selected={selected}
      className={cn(ROW_CLASS, className, extraClassName)}
    >
      {/* eslint-disable @eslint-react/static-components -- `Cell` is picked, not created: each
          candidate is a module-level component or the caller's own, with a stable identity. */}
      {columns.map((column, columnIndex) => {
        // Most specific first: this column's own template, then the cell its `type`
        // implies, then the table-wide `cell` slot or the default.
        const Cell =
          column.template ?? columnTypeCell<TRow>(column.type) ?? cellComponent

        return (
          <td
            key={column.id}
            data-id={column.id}
            data-align={getAlign(column.id)}
            className={cn(
              BODY_CELL_CLASS,
              cellClassName,
              column.cellClassName,
              getCellClassName(row, rowIndex, column, columnIndex)
            )}
            {...getStickyProps(columnIndex)}
          >
            <Cell
              {...cellProps}
              row={row}
              column={column}
              rowIndex={rowIndex}
            />
          </td>
        )
      })}
      {/* eslint-enable @eslint-react/static-components */}
    </tr>
  )
}

// Memoized because a resize drag re-renders PlainTable on every pointer move while none of these
// props change — column widths are committed once, when the drag ends. The memo only holds if the
// caller's `slotProps.cell`, `getRowClassName` and `getCellClassName` keep their identity, which
// is why the defaults above are hoisted.
const MemoRow = React.memo(RowImpl)
;(MemoRow as { displayName?: string }).displayName = "PlainTableRow"
const Row = MemoRow as typeof RowImpl

// ===================== PlainTable =====================

export interface PlainTableProps<TRow = PlainTableRowData> {
  /**
   * Identifies the table. Required for persistence and for reaching it through the table
   * registry; without one the table still works, but forgets its columns on reload.
   */
  id?: string
  /** Scopes persisted state to one user, so a shared browser does not share column widths. */
  userId?: string | number
  persistState?: boolean

  columns?: PlainTableColumn<TRow>[]
  rows?: TRow[]
  /** React key per row. Defaults to `row.id`, falling back to the index. */
  getRowId?: (row: TRow, index: number) => React.Key

  loading?: boolean
  /** How many skeleton rows stand in for the first page. Ignored once there are rows. */
  placeholderRows?: number
  /** Renders the error state in place of the rows. A string, or a ready-made node. */
  error?: React.ReactNode
  onRetry?: () => void

  slots?: PlainTableSlots<TRow>
  slotProps?: PlainTableSlotProps<TRow>

  resizableColumnsOptions?: Omit<
    UseResizableColumnsOptions,
    "tableId" | "storageKey" | "userId" | "persistState"
  >
  columnAlignOptions?: Omit<
    UseColumnAlignOptions,
    "tableId" | "storageKey" | "userId" | "persistState"
  >

  /** On the `<table>`. */
  className?: string
  /** On the scroll container around it. */
  wrapperClassName?: string
  bodyClassName?: string
  rowClassName?: string
  cellClassName?: string
  getRowClassName?: (row: TRow, rowIndex: number) => string
  /**
   * Marks rows as selected, as `aria-selected` on each `<tr>`. Given at all, EVERY row carries
   * the attribute, `false` included — that is what tells assistive tech the rows can be selected.
   *
   * A boolean per row rather than a props bag, so the memoised row compares one primitive. Keep
   * the function's identity stable for the same reason as `getRowClassName`.
   */
  isRowSelected?: (row: TRow, rowIndex: number) => boolean
  getCellClassName?: (
    row: TRow,
    rowIndex: number,
    column: PlainTableColumn<TRow>,
    columnIndex: number
  ) => string

  /**
   * Where the table steps up from `sm` to `md` and to `lg`, in px of its own width. Defaults to
   * `PLAIN_TABLE_SIZE_STEPS`; a composed table hands down its own.
   */
  sizeSteps?: { md: number; lg: number }

  ref?: React.Ref<PlainTableHandle>
}

function PlainTable<TRow = PlainTableRowData>({
  id,
  userId,
  persistState = false,
  columns = EMPTY_COLUMNS as unknown as PlainTableColumn<TRow>[],
  rows = EMPTY_ROWS as TRow[],
  getRowId = defaultGetRowId as (row: TRow, index: number) => React.Key,
  loading = false,
  placeholderRows = DEFAULT_PLACEHOLDER_ROWS,
  error,
  onRetry,
  slots = EMPTY_SLOTS as unknown as PlainTableSlots<TRow>,
  slotProps = EMPTY_SLOT_PROPS as unknown as PlainTableSlotProps<TRow>,
  resizableColumnsOptions = EMPTY_OPTIONS,
  columnAlignOptions = EMPTY_OPTIONS,
  className,
  wrapperClassName,
  bodyClassName,
  rowClassName,
  cellClassName,
  getRowClassName = noClassName,
  isRowSelected,
  getCellClassName = noClassName,
  sizeSteps = PLAIN_TABLE_SIZE_STEPS,
  ref,
}: PlainTableProps<TRow>) {
  const tableRef = React.useRef<HTMLTableElement>(null)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  // The table's own width, as a step the stylesheet reads — pinning switches on from `md`. Not
  // `container-type`: that would make the wrapper the containing block of anything fixed inside.
  const size = useSizeStep<PlainTableSize>(wrapperRef, {
    sm: 0,
    md: sizeSteps.md,
    lg: sizeSteps.lg,
  })

  // Pinned columns are hoisted to the edges of the row, because `position: sticky` pins a cell
  // where it already sits — a "sticky left" column in the middle would stick in the middle.
  const sortedColumns = React.useMemo(() => {
    const left: PlainTableColumn<TRow>[] = []
    const middle: PlainTableColumn<TRow>[] = []
    const right: PlainTableColumn<TRow>[] = []

    for (const column of columns) {
      if (column.stickyLeft) left.push(column)
      else if (column.stickyRight) right.push(column)
      else middle.push(column)
    }

    return [...left, ...middle, ...right]
  }, [columns])

  const {
    colgroup,
    tableWidth,
    isResizing,
    dragLine,
    dragLimit,
    getResizeHandlers,
    ...widths
  } = useResizableColumns(sortedColumns, wrapperRef, {
    ...resizableColumnsOptions,
    tableId: id,
    storageKey: DEFAULT_STORAGE_KEY,
    userId,
    persistState,
  })

  const getStickyProps = useStickyColumns(sortedColumns, colgroup)

  const {
    getAlign,
    setAlign,
    toggleAlign,
    resetAlign,
    resetAllAligns,
    overrides,
  } = useColumnAlign(sortedColumns, {
    ...columnAlignOptions,
    tableId: id,
    storageKey: DEFAULT_STORAGE_KEY,
    userId,
    persistState,
  })

  useRegisterTableScope(id, "columnAlign", {
    getState: () =>
      Object.fromEntries(
        sortedColumns.map((column) => [column.id, getAlign(column.id)])
      ),
    actions: {
      getAlign,
      setAlign,
      toggleAlign,
      resetAlign,
      resetAll: resetAllAligns,
    },
  })

  useRegisterTableScope(id, "columnWidth", {
    getState: () =>
      Object.fromEntries(
        sortedColumns.map((column) => [
          column.id,
          widths.getColumnWidth(column.id),
        ])
      ),
    actions: {
      getColumnWidth: widths.getColumnWidth,
      setColumnWidth: widths.setColumnWidth,
      resetColumnWidth: widths.resetColumnWidth,
      resetAll: widths.resetWidths,
    },
  })

  // One notification per committed change, for whoever subscribed to this table's id.
  React.useEffect(() => {
    if (id) emitChange(id)
  }, [id, overrides, widths.widths])

  React.useImperativeHandle(ref, () => ({ tableRef, wrapperRef }), [])

  // The preview line spans the table, so it needs the table's height — measured once when a
  // drag starts, not on every pointer move as the old component did. `getBoundingClientRect`
  // forces layout, and the old effect ran it for each pixel of every drag.
  const [dragHeight, setDragHeight] = React.useState(0)

  React.useLayoutEffect(() => {
    if (!isResizing) return

    setDragHeight(tableRef.current?.getBoundingClientRect().height ?? 0)
  }, [isResizing])

  const Header = slots.header ?? PlainTableHeader
  const Footer = slots.footer ?? PlainTableFooter
  const Loader = slots.loader ?? PlainTableLoader
  const NoData = slots.noData ?? PlainTableNoData
  const ErrorState = slots.error ?? PlainTableError
  const DragPreview = slots.dragPreview ?? PlainTableDragPreview
  const CellContent = slots.cell ?? PlainTableCellContent

  const isEmpty = rows.length === 0
  // Skeletons stand in only when there is nothing to show. With rows on screen a refetch keeps
  // them, dimmed under a progress bar, so the table never flashes back to placeholders.
  const showPlaceholders = loading && isEmpty && !error
  const columnSpan = Math.max(sortedColumns.length, 1)

  let body: React.ReactNode

  if (error) {
    body = (
      <tr>
        <td colSpan={columnSpan}>
          <ErrorState {...slotProps.error} error={error} onRetry={onRetry} />
        </td>
      </tr>
    )
  } else if (showPlaceholders) {
    body = Array.from({ length: placeholderRows }, (_, rowIndex) => (
      <tr key={rowIndex} className={cn(ROW_CLASS, rowClassName)}>
        {sortedColumns.map((column, columnIndex) => (
          <td
            key={column.id}
            // So a bar stands where the column's values will: a right-aligned
            // column's placeholders hug the right edge.
            data-align={getAlign(column.id)}
            className={cn(BODY_CELL_CLASS, cellClassName, column.cellClassName)}
          >
            {/* One line of text, its width varying by cell, so the first load reads as rows of
                text arriving rather than a grid of identical bars. */}
            <Skeleton
              className="inline-block h-3.5 w-[70%] align-middle in-data-[align=center]:mx-auto in-data-[align=right]:ml-auto"
              style={{ width: placeholderWidth(rowIndex, columnIndex) }}
            />
          </td>
        ))}
      </tr>
    ))
  } else if (isEmpty) {
    body = (
      <tr>
        <td colSpan={columnSpan}>
          <NoData {...slotProps.noData} />
        </td>
      </tr>
    )
  } else {
    body = rows.map((row, rowIndex) => (
      <Row
        key={getRowId(row, rowIndex)}
        row={row}
        rowIndex={rowIndex}
        columns={sortedColumns}
        cellComponent={CellContent}
        cellProps={slotProps.cell}
        className={rowClassName}
        extraClassName={getRowClassName(row, rowIndex)}
        selected={isRowSelected?.(row, rowIndex)}
        cellClassName={cellClassName}
        getAlign={getAlign}
        getStickyProps={getStickyProps}
        getCellClassName={getCellClassName}
      />
    ))
  }

  return (
    <div
      ref={wrapperRef}
      data-slot="plain-table-wrapper"
      data-size={size}
      data-pinning={size === "sm" ? undefined : ""}
      data-loading={loading ? "" : undefined}
      // Its own stacking context: the sticky header, columns and progress bar stack among
      // themselves and never above the page's own sticky bars.
      className={cn(
        "group/plain-table relative isolate w-full overflow-auto",
        wrapperClassName
      )}
    >
      {dragLine !== null ? (
        <DragPreview
          {...slotProps.dragPreview}
          offset={dragLine}
          height={dragHeight}
          limit={dragLimit}
        />
      ) : null}
      {loading && !showPlaceholders ? <Loader {...slotProps.loader} /> : null}
      <table
        ref={tableRef}
        data-slot="plain-table"
        data-empty={isEmpty ? "" : undefined}
        // Fixed layout makes the `<colgroup>` authoritative: the widths React computes are the
        // widths the browser uses, so sticky offsets are arithmetic rather than measurement.
        className={cn(
          "mb-0 table-fixed border-separate border-spacing-0 bg-transparent data-empty:table-auto",
          className
        )}
        // `tableWidth` (from `useResizableColumns`) already accounts for the wrapper's own
        // width — it hands a narrower table's slack to whichever columns can take it — so
        // the table never needs `min-width: 100%` here to fill its container; that CSS
        // property would fill it by stretching EVERY column by the same ratio, `min`/`max`
        // or not. An empty table has no widths worth honouring, so it just fills.
        style={{ width: isEmpty ? "100%" : `${tableWidth}px` }}
      >
        <colgroup>
          {colgroup.map((column) => (
            <col key={column.id} style={{ width: `${column.width}px` }} />
          ))}
        </colgroup>
        <Header
          {...slotProps.header}
          columns={sortedColumns}
          isEmpty={isEmpty}
          slots={slots}
          slotProps={slotProps}
          getAlign={getAlign}
          getStickyProps={getStickyProps}
          onAlignToggle={toggleAlign}
          onAlignChange={setAlign}
          getResizeHandlers={getResizeHandlers}
        />
        <tbody
          data-slot="plain-table-body"
          // A refetch keeps the rows readable but plainly stale, and out of reach until the
          // answer lands — a click on a row about to be replaced acts on something gone.
          className={cn(
            "transition-opacity group-data-loading/plain-table:pointer-events-none group-data-loading/plain-table:opacity-55",
            bodyClassName
          )}
          onPointerOver={titleTruncatedCell}
        >
          {body}
        </tbody>
        <Footer
          {...slotProps.footer}
          columns={sortedColumns}
          // Not while the placeholders or a failure stand in for the rows.
          rows={error || showPlaceholders ? EMPTY_ROWS : rows}
          getAlign={getAlign}
          getStickyProps={getStickyProps}
        />
      </table>
    </div>
  )
}

export {
  PlainTable,
  PlainTableAlignButton,
  PlainTableCellContent,
  PlainTableColumnMenu,
  PlainTableDragPreview,
  PlainTableError,
  PlainTableFooter,
  PlainTableHeader,
  PlainTableHeaderCell,
  PlainTableHeaderCellLabel,
  PlainTableLoader,
  PlainTableNoData,
  PlainTableResizeHandle,
}
