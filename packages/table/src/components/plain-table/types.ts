import type { IconSource } from "../../internal/icon"
import type * as React from "react"

// The shared vocabulary of PlainTable: the column descriptor, the props every slot receives,
// and the two maps that connect them. They live here rather than in `plain-table.tsx` because
// the hooks and the slot components all reference them, and a component file that also defines
// the types its own hooks import reads backwards.

/** Where a column's content sits inside its cell. Also the cycle the align button walks. */
export type PlainTableColumnAlign = "left" | "center" | "right"

/**
 * What a column's values ARE, as opposed to how they look.
 *
 * Naming the kind sets sensible defaults for the attributes that follow from it — `number` aligns
 * right and gets two decimals, `date` and `datetime` are rendered in the format and timezone the
 * app configured on its `DataTableConfigProvider`. Every one of those is only a DEFAULT: a column
 * that also spells out `align` or `template` gets what it asked for.
 */
export type PlainTableColumnType = "date" | "datetime" | "number"

/** The default row shape: a flat bag keyed by column id. Pass your own for typed cells. */
export type PlainTableRowData = Record<string, unknown>

/** Which edge a column is pinned to, once the body scrolls sideways. */
export type PlainTableStickySide = "left" | "right"

export interface PlainTableColumn<TRow = PlainTableRowData> {
  /** Unique within the table. Keys the cell value, the persisted width and the persisted align. */
  id: string
  /**
   * The header text. A function is called at render time, for a header that has to compute
   * something — but it gets no arguments, so anything data-dependent belongs in a `header`
   * slot instead.
   */
  label?: React.ReactNode | (() => React.ReactNode)
  /**
   * What the values are, which is enough to render and align most columns without a `template`.
   * Anything this column also states for itself wins over the type's default.
   */
  type?: PlainTableColumnType
  /** Starting alignment. Overrides the one `type` implies. A user's own choice wins over both. */
  align?: PlainTableColumnAlign
  /** Whether the header offers the align control. On by default. */
  isAlignable?: boolean
  /**
   * Whether the header offers the resize handle. Off by default.
   *
   * This is the single switch now: the old component had `isResizable` gate the handle while
   * the resize hook separately checked `resizable !== false`, so a column could render a
   * handle that refused to drag.
   */
  isResizable?: boolean
  /** Drag limits, in px. Fall back to the table-wide defaults in `resizableColumnsOptions`. */
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  /** Pins the column to the leading edge. Pinned columns are hoisted to the front of the row. */
  stickyLeft?: boolean
  /** Pins the column to the trailing edge. Pinned columns are hoisted to the end of the row. */
  stickyRight?: boolean
  headerCellClassName?: string
  cellClassName?: string
  /**
   * Renders this column's cells. Overrides both the `type`'s own cell and the `cell` slot, for
   * this column only.
   */
  template?: React.ComponentType<PlainTableCellProps<TRow>>
  /**
   * This column's cell in a totals row under the body — a sum, a count, a label. Given on any
   * column, the default `footer` slot draws a `<tfoot>` row, stuck to the bottom of the scroll
   * area, in the column's alignment; columns without one get an empty cell.
   */
  footer?: (rows: TRow[]) => React.ReactNode
}

/**
 * What a resize handle has to spread onto its root to be draggable — and, as a focusable
 * `separator`, to announce where it stands: the column's current width and its limits, in px.
 */
export interface PlainTableResizeHandlers {
  "aria-valuenow": number
  "aria-valuemin": number
  "aria-valuemax": number
  onPointerDown: React.PointerEventHandler<HTMLElement>
  onPointerMove: React.PointerEventHandler<HTMLElement>
  onPointerUp: React.PointerEventHandler<HTMLElement>
  onPointerCancel: React.PointerEventHandler<HTMLElement>
  onDoubleClick: React.MouseEventHandler<HTMLElement>
  onKeyDown: React.KeyboardEventHandler<HTMLElement>
}

/** What a sticky cell has to spread onto its `<th>` / `<td>` to be pinned. */
export interface PlainTableStickyProps {
  "data-sticky"?: PlainTableStickySide
  /** Present on the pinned column facing the scrolling content — the one that draws the seam. */
  "data-sticky-end"?: ""
  style?: React.CSSProperties
}

// ===================== the column menu =====================

// DECISION: the column menu is typed as groups of rows, not `ActionsEntry[]` — an action has no
// checked state, radio group or heading, and Align and Sort need all three.
/** One row of a column's header menu. */
export interface PlainTableColumnMenuItem {
  /** Identity within its group — and, in a `radio` group, the value the group holds. */
  key: string
  label: React.ReactNode
  icon?: IconSource
  /**
   * Whether this row is the current state — the alignment the column has, the direction it is
   * sorted in. Given at all (`false` included), the row is drawn as a checkable one.
   */
  checked?: boolean
  disabled?: boolean
  variant?: "default" | "destructive"
  onSelect: () => void
}

/**
 * A run of rows in a column's header menu, set off from its neighbours by a separator.
 *
 * Groups rather than a flat list because the menu is assembled from several owners — `PlainTable`
 * contributes Align, a composed table adds Sort, Pin and Hide around it — and each owner hands over
 * its own section without having to know where the separators fall.
 */
export interface PlainTableColumnMenuGroup {
  key: string
  /** A heading above the rows, e.g. "Align". */
  label?: React.ReactNode
  /** The rows are one choice among several, exactly one `checked` — drawn as radio rows. */
  radio?: boolean
  items: PlainTableColumnMenuItem[]
}

// ===================== slot props =====================

export interface PlainTableCellProps<TRow = PlainTableRowData> {
  row: TRow
  column: PlainTableColumn<TRow>
  rowIndex: number
}

export interface PlainTableHeaderCellLabelProps<TRow = PlainTableRowData> {
  column: PlainTableColumn<TRow>
  className?: string
}

/**
 * @deprecated The header no longer draws an align button: alignment lives in the column menu (see
 * `PlainTableHeaderProps.getColumnMenuItems`). Still honoured when a caller passes
 * `slots.alignButton` explicitly; removed in the next major.
 */
export interface PlainTableAlignButtonProps<TRow = PlainTableRowData> {
  column: PlainTableColumn<TRow>
  align: PlainTableColumnAlign
  onAlignToggle: (columnId: string) => void
  className?: string
}

export interface PlainTableResizeHandleProps<
  TRow = PlainTableRowData,
> extends PlainTableResizeHandlers {
  column: PlainTableColumn<TRow>
  className?: string
}

export interface PlainTableHeaderCellProps<TRow = PlainTableRowData> {
  column: PlainTableColumn<TRow>
  align: PlainTableColumnAlign
  /** No rows yet — there is nothing to align or resize against, so the controls stay hidden. */
  isEmpty: boolean
  slots: PlainTableSlots<TRow>
  slotProps: PlainTableSlotProps<TRow>
  onAlignToggle: (columnId: string) => void
  getResizeHandlers: (columnId: string) => PlainTableResizeHandlers
  /**
   * The column's header menu, already assembled. Empty — nothing to offer — means no chevron at
   * all rather than one opening an empty menu.
   */
  menu?: PlainTableColumnMenuGroup[]
  className?: string
}

export interface PlainTableHeaderProps<TRow = PlainTableRowData> {
  columns: PlainTableColumn<TRow>[]
  isEmpty: boolean
  slots: PlainTableSlots<TRow>
  slotProps: PlainTableSlotProps<TRow>
  getAlign: (columnId: string) => PlainTableColumnAlign
  getStickyProps: (columnIndex: number) => PlainTableStickyProps
  onAlignToggle: (columnId: string) => void
  /** Sets one column's alignment — what the Align section of the column menu calls. */
  onAlignChange?: (columnId: string, align: PlainTableColumnAlign) => void
  getResizeHandlers: (columnId: string) => PlainTableResizeHandlers
  /**
   * Assembles one column's header menu (the chevron beside its label).
   *
   * `defaults` is what `PlainTable` offers on its own — the Align section, for an alignable column
   * of a table with rows. Return it as it is, add groups around it, or leave it out; a composed
   * table puts Sort before it and Pin / Hide after it. An empty result draws no chevron.
   * Omitted, the menu is `defaults`.
   */
  getColumnMenuItems?: (
    column: PlainTableColumn<TRow>,
    defaults: PlainTableColumnMenuGroup[]
  ) => PlainTableColumnMenuGroup[]
  className?: string
  rowClassName?: string
  cellClassName?: string
  getHeaderCellClassName?: (column: PlainTableColumn<TRow>) => string
  /**
   * Extra attributes for one column's `<th>`.
   *
   * `aria-sort` is what this exists for: it belongs on the `columnheader`, and a composed table
   * that adds sorting has no other way to put it there — `headerCell` is a slot for the cell's
   * CONTENT, not the cell. A `title` or a `data-*` marker fits here too.
   *
   * Spread BEFORE the cell's own attributes, so it can add to a header cell but never take
   * `scope`, `data-align` or the sticky offsets away from it.
   */
  getHeaderCellProps?: (
    column: PlainTableColumn<TRow>
  ) => React.ComponentProps<"th">
}

export interface PlainTableFooterProps<TRow = PlainTableRowData> {
  columns: PlainTableColumn<TRow>[]
  /** The rows on screen — what a column's `footer` totals. */
  rows?: TRow[]
  getAlign?: (columnId: string) => PlainTableColumnAlign
  getStickyProps?: (columnIndex: number) => PlainTableStickyProps
  className?: string
}

export interface PlainTableLoaderProps {
  className?: string
}

export interface PlainTableNoDataProps {
  /** The title when there are no rows at all. Defaults to `messages.body.empty`. */
  message?: React.ReactNode
  /** A line under it — "Orders from your channels appear here as they arrive." */
  description?: React.ReactNode
  /**
   * The rows are narrowed to nothing rather than absent, which is a different state with a
   * different way out: the filtered title, and Clear filters.
   */
  hasFilters?: boolean
  /** What Clear filters does. Absent, the button is not drawn. */
  onClearFilters?: () => void
  /** The title when filters matched nothing. Defaults to `messages.body.filteredEmpty`. */
  filteredMessage?: React.ReactNode
  filteredDescription?: React.ReactNode
  className?: string
}

export interface PlainTableErrorProps {
  /** Whatever the caller passed as `error` — a message, or a ready-made node. */
  error?: React.ReactNode
  onRetry?: () => void
  /** The heading. Defaults to `messages.body.errorTitle`. */
  title?: React.ReactNode
  /** Adds "Your filters are kept." — a retry asks the same question again. */
  hasFilters?: boolean
  className?: string
}

export interface PlainTableDragPreviewProps {
  /** Distance from the wrapper's leading content edge, in px. */
  offset: number
  height: number
  /** Set once the drag is pushing past the column's `minWidth` / `maxWidth`. */
  limit: "min" | "max" | null
  className?: string
}

// ===================== slots =====================

/**
 * Every replaceable part, and the props it is called with.
 *
 * One map defines both `slots` and `slotProps`, so a component and the extra props handed to it
 * can never describe different shapes. This replaced the old pairs of
 * `xxxComponent` / `xxxProps` props — ten of each in the signature, none of them typed.
 */
export interface PlainTableSlotPropsMap<TRow = PlainTableRowData> {
  header: PlainTableHeaderProps<TRow>
  headerCell: PlainTableHeaderCellProps<TRow>
  headerCellLabel: PlainTableHeaderCellLabelProps<TRow>
  alignButton: PlainTableAlignButtonProps<TRow>
  resizeHandle: PlainTableResizeHandleProps<TRow>
  cell: PlainTableCellProps<TRow>
  footer: PlainTableFooterProps<TRow>
  loader: PlainTableLoaderProps
  noData: PlainTableNoDataProps
  error: PlainTableErrorProps
  dragPreview: PlainTableDragPreviewProps
}

export type PlainTableSlots<TRow = PlainTableRowData> = {
  [K in keyof PlainTableSlotPropsMap<TRow>]?: React.ComponentType<
    PlainTableSlotPropsMap<TRow>[K]
  >
}

export type PlainTableSlotProps<TRow = PlainTableRowData> = {
  [K in keyof PlainTableSlotPropsMap<TRow>]?: Partial<
    PlainTableSlotPropsMap<TRow>[K]
  >
}

/** What `ref` gives you: the two elements, for scroll position and measurement. */
export interface PlainTableHandle {
  tableRef: React.RefObject<HTMLTableElement | null>
  wrapperRef: React.RefObject<HTMLDivElement | null>
}
