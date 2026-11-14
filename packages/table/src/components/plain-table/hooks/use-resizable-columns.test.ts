import { act, renderHook } from "@testing-library/react"
import type * as React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_STORAGE_KEY,
  KEYBOARD_RESIZE_STEP,
} from "../constants"
import type { PlainTableColumn } from "../types"
import type { UseResizableColumnsOptions } from "./use-resizable-columns"
import { useResizableColumns } from "./use-resizable-columns"

type Row = Record<string, unknown>

const columns: PlainTableColumn<Row>[] = [
  {
    id: "sku",
    defaultWidth: 200,
    minWidth: 100,
    maxWidth: 300,
    isResizable: true,
  },
  { id: "qty", isResizable: true },
  { id: "fixed", defaultWidth: 50, minWidth: 50, maxWidth: 50 },
]

// jsdom measures nothing, so the wrapper never reports a width and no slack is handed out — every
// width below is the natural one.
const wrapperRef = { current: null } as React.RefObject<HTMLDivElement | null>

function setup(
  options: Partial<UseResizableColumnsOptions> = {},
  initialColumns: PlainTableColumn<Row>[] = columns
) {
  return renderHook(
    ({ cols }) =>
      useResizableColumns(cols, wrapperRef, {
        storageKey: DEFAULT_STORAGE_KEY,
        ...options,
      }),
    { initialProps: { cols: initialColumns } }
  )
}

/** A keyboard event with only what the handler reads. */
function key(value: string) {
  return {
    key: value,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLElement>
}

beforeEach(() => {
  localStorage.clear()
})

describe("useResizableColumns", () => {
  it("starts every column at its default width, or the table-wide one", () => {
    const { result } = setup()

    expect(result.current.colgroup).toEqual([
      { id: "sku", width: 200 },
      { id: "qty", width: DEFAULT_COLUMN_WIDTH },
      { id: "fixed", width: 50 },
    ])
    expect(result.current.tableWidth).toBe(200 + DEFAULT_COLUMN_WIDTH + 50)
  })

  it("clamps a width to the column limits", () => {
    const { result } = setup()

    act(() => result.current.setColumnWidth("sku", 900))

    expect(result.current.getColumnWidth("sku")).toBe(300)
  })

  it("reports a committed width with every override after it", () => {
    const onResizeEnd = vi.fn()
    const { result } = setup({ onResizeEnd })

    act(() => result.current.setColumnWidth("sku", 250))

    expect(onResizeEnd).toHaveBeenCalledWith({
      columnId: "sku",
      width: 250,
      widths: { sku: 250 },
    })
    expect(result.current.widths).toEqual({ sku: 250 })
  })

  it("resets one column, then all of them", () => {
    const { result } = setup()

    act(() => result.current.setColumnWidth("sku", 250))
    act(() => result.current.setColumnWidth("qty", 180))
    act(() => result.current.resetColumnWidth("sku"))

    expect(result.current.widths).toEqual({ qty: 180 })

    act(() => result.current.resetWidths())

    expect(result.current.widths).toEqual({})
  })

  it("persists overrides per table id and reads them back on mount", () => {
    const first = setup({ tableId: "orders", persistState: true })

    act(() => first.result.current.setColumnWidth("sku", 260))
    first.unmount()

    const second = setup({ tableId: "orders", persistState: true })

    expect(second.result.current.getColumnWidth("sku")).toBe(260)
  })

  it("resizes from the keyboard in steps, and Home restores the default", () => {
    const { result } = setup()

    act(() =>
      result.current.getResizeHandlers("sku").onKeyDown(key("ArrowRight"))
    )
    expect(result.current.getColumnWidth("sku")).toBe(
      200 + KEYBOARD_RESIZE_STEP
    )

    act(() => result.current.getResizeHandlers("sku").onKeyDown(key("Home")))
    expect(result.current.getColumnWidth("sku")).toBe(200)
  })

  it("ignores the keyboard on a column that is not resizable", () => {
    const { result } = setup()

    act(() =>
      result.current.getResizeHandlers("fixed").onKeyDown(key("ArrowRight"))
    )

    expect(result.current.widths).toEqual({})
  })

  it("hands the handle its width and limits to announce", () => {
    const { result } = setup({ minWidth: 60, maxWidth: 600 })

    expect(result.current.getResizeHandlers("sku")).toMatchObject({
      "aria-valuenow": 200,
      "aria-valuemin": 100,
      "aria-valuemax": 300,
    })
    // Falls back to the table-wide limits when the column sets none.
    expect(result.current.getResizeHandlers("qty")).toMatchObject({
      "aria-valuemin": 60,
      "aria-valuemax": 600,
    })
  })

  // The colgroup reaches every memoised row through the sticky offsets, so a new array with the
  // same widths in it would re-render the whole body for nothing.
  it("keeps the colgroup identity while no width changes", () => {
    const { result, rerender } = setup()
    const before = result.current.colgroup

    rerender({ cols: [...columns] })

    expect(result.current.colgroup).toBe(before)

    act(() => result.current.setColumnWidth("sku", 250))

    expect(result.current.colgroup).not.toBe(before)
  })
})
