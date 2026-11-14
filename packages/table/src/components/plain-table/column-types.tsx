import type * as React from "react"

import { useTableLocale } from "../../hooks/use-table-locale"
import { formatNumber } from "../../lib/format"
import { formatDateValue } from "../../lib/format-cell-value"

import type {
  PlainTableCellProps,
  PlainTableColumnAlign,
  PlainTableColumnType,
  PlainTableRowData,
} from "./types"

// What each `column.type` means, in the two places a type can speak for a column: the cell that
// renders its values, and the alignment it starts out with.
//
// It exists because the alternative is what the stories used to do — a hand-written `template` per
// column doing `row.total.toFixed(2)`. That spelling of "this is money" is invisible to the table,
// repeated at every call site, and unaware of the locale and date format the app configured once
// on its provider.

/** Two decimals: a column of amounts that lines up on the separator, and never rags. */
const FRACTION_DIGITS = 2

/**
 * The type's own cells.
 *
 * All three keep `PlainTableCellContent`'s contract: an absent value renders an empty cell, and a
 * value that cannot be interpreted is shown as it came rather than dropped — a wrong-looking cell
 * says where to look, a blank one says nothing.
 */

function DateCellContent<TRow>({ row, column }: PlainTableCellProps<TRow>) {
  const settings = useTableLocale()
  const value = (row as Record<string, unknown>)?.[column.id]

  if (value == null || value === "") return null

  return <>{formatDateValue(value, settings, "date")}</>
}

function DateTimeCellContent<TRow>({ row, column }: PlainTableCellProps<TRow>) {
  const settings = useTableLocale()
  const value = (row as Record<string, unknown>)?.[column.id]

  if (value == null || value === "") return null

  return <>{formatDateValue(value, settings, "datetime")}</>
}

function NumberCellContent<TRow>({ row, column }: PlainTableCellProps<TRow>) {
  const { locale } = useTableLocale()
  const value = (row as Record<string, unknown>)?.[column.id]

  if (value == null || value === "") return null

  // A numeric string counts: JSON carries big decimals as strings precisely so they survive the
  // trip, and a column typed `number` means them just as much as it means a JS number.
  const numeric = typeof value === "number" ? value : Number(value)
  const formatted =
    (typeof value === "number" || typeof value === "string") &&
    Number.isFinite(numeric)
      ? formatNumber(
          numeric,
          {
            minimumFractionDigits: FRACTION_DIGITS,
            maximumFractionDigits: FRACTION_DIGITS,
          },
          locale
        )
      : null

  return <>{formatted ?? String(value)}</>
}

// Module-level maps, so a lookup hands back the SAME component reference on every render. Building
// the cell inline would give React a new component type each time, remounting every cell in the
// column on every render and quietly undoing the `React.memo` on the row.

const COLUMN_TYPE_ALIGN: Partial<
  Record<PlainTableColumnType, PlainTableColumnAlign>
> = {
  // Digits are compared by reading right to left, so the separators have to line up.
  number: "right",
}

const COLUMN_TYPE_CELL: Record<
  PlainTableColumnType,
  React.ComponentType<PlainTableCellProps<PlainTableRowData>>
> = {
  date: DateCellContent,
  datetime: DateTimeCellContent,
  number: NumberCellContent,
}

/** The alignment a type implies, or `undefined` when it implies none. */
export function columnTypeAlign(type: PlainTableColumnType | undefined) {
  return type === undefined ? undefined : COLUMN_TYPE_ALIGN[type]
}

/** The cell a type renders with, or `undefined` for an untyped column. */
export function columnTypeCell<TRow>(
  type: PlainTableColumnType | undefined
): React.ComponentType<PlainTableCellProps<TRow>> | undefined {
  // One map serves every row type: these cells read `row[column.id]` as `unknown` and never
  // touch the row's shape, which is what the cast says. The alternative is a map per table, and
  // with it a new component identity per render.
  return type === undefined
    ? undefined
    : (COLUMN_TYPE_CELL[type] as React.ComponentType<PlainTableCellProps<TRow>>)
}
