/**
 * The widths, in px of the TABLE (not the window), at which it steps up from `sm` to `md` to `lg`.
 * Written out as `data-size` on the root, and what the chrome reads: below `md` the toolbar takes
 * two rows and moves Refresh and Export into "⋯", the chips scroll in one line, the pager shows
 * only the current page and nothing is pinned; below `lg` the second table action joins them.
 * Override per table with `sizeSteps`, or app-wide on `DataTableConfigProvider`.
 */
export const DATA_TABLE_SIZE_STEPS = { md: 640, lg: 960 } as const

/** Where a composed table keeps its persisted state, beside `PlainTable`'s own key. */
export const DATA_TABLE_STORAGE_KEY = "toth-data-table"

export const DEFAULT_PAGE_SIZE = 25
export const DEFAULT_PAGE_SIZES = [25, 50, 100, 150, 200, 500]

/**
 * The two columns the table adds to whatever it was given.
 *
 * Double-underscored so they cannot collide with a server field, and pinned to the edges: a
 * checkbox that scrolls away from its row, or a row menu that has to be scrolled to, is worse than
 * no column at all.
 */
export const SELECTION_COLUMN_ID = "__selection"
export const ACTIONS_COLUMN_ID = "__actions"

/**
 * The geometry of the row-actions cell, in px. Each of the three mirrors a rule in a stylesheet no
 * TypeScript can read at runtime, so each names the rule it is a copy of — change one there and
 * change it here. Column widths in this table are authoritative rather than measured (see
 * `use-resizable-columns.ts`), which is what makes the copy necessary.
 */
/** One control: `Button`'s `--size-icon-sm`, `@include square(1.75rem)` in `button.module.scss`. */
const CONTROL_SIZE = 28
/** Between two of them: `.actions { gap: tokens.space('sm') }` in `actions.module.scss`. */
const CONTROL_GAP = 8
/**
 * Either side of them: `.data-table-control-cell` in `data-table.module.scss`, which narrows the
 * actions column's padding to `tokens.space('sm')` — the data cells' own `0.75rem` would leave the
 * controls off-centre in a column sized from this.
 */
const CELL_PADDING = 8

/**
 * What a cell holding `controlCount` `icon-sm` controls needs: the controls, the gaps between them
 * and the cell's own padding.
 *
 * The row-actions cell pins `size="icon-sm"` and `DataTableRowAction` carries no `size`, no `panel`
 * and no `menuItems`, so every control in it really is one fixed square and this is exact rather
 * than an estimate.
 */
export function actionsColumnWidth(controlCount: number): number {
  const controls = Math.max(controlCount, 1)

  return (
    controls * CONTROL_SIZE + (controls - 1) * CONTROL_GAP + 2 * CELL_PADDING
  )
}

/**
 * Wide enough for one control — a row menu with nothing promoted out of it.
 *
 * This was 40 before the column learned to size itself, which is 4px short of the 28px trigger plus
 * the cell's padding: with `box-sizing: border-box`, `overflow: hidden` and `table-layout: fixed`,
 * the trigger was clipped 2px on each side.
 */
export const CONTROL_COLUMN_WIDTH = actionsColumnWidth(1)

/**
 * Wider, because the selection header holds two: the box and the chevron for the menu beside it.
 * The rows below only hold a box, but a column is one width all the way down.
 *
 * The 16px box, a 2px gap and the 20px chevron (`selection-cells.module.scss`), plus the cell's
 * `0.75rem` padding either side — 62px, rounded up to the 8px grid. The pair sits side by side now;
 * this was 56 when the chevron was pulled back over the box with a negative margin.
 */
export const SELECTION_COLUMN_WIDTH = 64

/**
 * Where the library's own toolbar actions sit on the shared `order` scale.
 *
 * Published so a consumer can place an action relative to them — `order: EXPORT_ACTION_ORDER - 1`
 * puts something just before Export — instead of guessing at a number and finding out later.
 *
 * The view controls lead the left cluster in the order a user reaches for them — Filters, View
 * options, Refresh — ahead of anything a consumer adds there without an `order` (which lands at
 * 10, 20, …). Export leads the table actions on the right.
 */
// DECISION: the view anchors moved to 1 / 2 / 3 so Filters → View options → Refresh lead the
// left cluster ahead of unordered consumer entries (10, 20, …).
export const EXPORT_ACTION_ORDER = 10
export const FILTERS_ACTION_ORDER = 1
export const COLUMNS_ACTION_ORDER = 2
export const REFRESH_ACTION_ORDER = 3

/**
 * How long the filter panel waits before applying, when it applies as you type.
 *
 * Long enough that typing a word is one request rather than five, short enough that it still feels
 * like the table is following along.
 */
export const FILTER_APPLY_DEBOUNCE = 400

/** The search box waits longer: a term is usually several words, and each one is a round trip. */
export const SEARCH_DEBOUNCE = 700

/** How many characters the search box accepts, matching the server's own limit. */
export const SEARCH_MAX_LENGTH = 255
