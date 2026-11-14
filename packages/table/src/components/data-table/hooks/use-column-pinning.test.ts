import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DataTableColumn } from "../data-table.types"
import { useColumnPinning } from "./use-column-pinning"

interface Row {
  sku: string
}

const columns: DataTableColumn<Row>[] = [
  { id: "sku" },
  { id: "qty" },
  { id: "notes" },
]

const STORAGE_KEY = "toth-test-column-pinning"

type Options = Parameters<typeof useColumnPinning<Row>>[0]

function setup(overrides: Partial<Options> = {}) {
  return renderHook(() =>
    useColumnPinning<Row>({ storageKey: STORAGE_KEY, columns, ...overrides })
  )
}

const pinnedFlags = (list: DataTableColumn<Row>[]) =>
  list.map((column) => [
    column.id,
    column.stickyLeft ?? false,
    column.stickyRight ?? false,
  ])

beforeEach(() => {
  localStorage.clear()
})

describe("useColumnPinning", () => {
  it("starts with nothing pinned", () => {
    const { result } = setup()

    expect(result.current.pinning).toEqual({ left: [], right: [] })
  })

  it("seeds from the columns that declare themselves sticky", () => {
    const { result } = setup({
      columns: [
        { id: "sku", stickyLeft: true },
        { id: "qty" },
        { id: "notes", stickyRight: true },
      ],
    })

    expect(result.current.pinning).toEqual({ left: ["sku"], right: ["notes"] })
  })

  it("pins a column to either edge", () => {
    const { result } = setup()

    act(() => result.current.setPin("qty", "left"))
    expect(result.current.getPinSide("qty")).toBe("left")

    act(() => result.current.setPin("qty", "right"))
    expect(result.current.getPinSide("qty")).toBe("right")
    expect(result.current.pinning).toEqual({ left: [], right: ["qty"] })
  })

  it("unpins with false", () => {
    const { result } = setup()

    act(() => result.current.setPin("qty", "left"))
    act(() => result.current.setPin("qty", false))

    expect(result.current.getPinSide("qty")).toBe(false)
    expect(result.current.pinning).toEqual({ left: [], right: [] })
  })

  it("rewrites the columns sticky flags from the state", () => {
    const { result } = setup()

    act(() => result.current.setPin("notes", "right"))

    expect(pinnedFlags(result.current.pinnedColumns)).toEqual([
      ["sku", false, false],
      ["qty", false, false],
      ["notes", false, true],
    ])
  })

  it("overrides a declaration the user has unpinned", () => {
    // The state is authoritative, not additive: a column the user unpinned stays unpinned even
    // though its declaration says sticky.
    const { result } = setup({
      columns: [{ id: "sku", stickyLeft: true }, { id: "qty" }],
    })

    act(() => result.current.setPin("sku", false))

    expect(pinnedFlags(result.current.pinnedColumns)).toEqual([
      ["sku", false, false],
      ["qty", false, false],
    ])
  })

  it("keeps the same column object when its flags do not change", () => {
    // `PlainTable` partitions on these flags, so handing it a new object for every column on
    // every render would defeat every memo below it.
    const { result } = setup()

    act(() => result.current.setPin("notes", "right"))

    expect(result.current.pinnedColumns[0]).toBe(columns[0])
    expect(result.current.pinnedColumns[2]).not.toBe(columns[2])
  })

  it("never leaves a column sticky to both edges", () => {
    const { result } = setup()

    act(() => result.current.setPinning({ left: ["qty"], right: ["qty"] }))

    expect(pinnedFlags(result.current.pinnedColumns)).toContainEqual([
      "qty",
      true,
      false,
    ])
  })

  it("resets every pin", () => {
    const { result } = setup({ columns: [{ id: "sku", stickyLeft: true }] })

    act(() => result.current.reset())

    expect(result.current.pinning).toEqual({ left: [], right: [] })
  })

  describe("persistence", () => {
    it("writes both sides under the table id", () => {
      const { result } = setup({ tableId: "orders", persistState: true })

      act(() => result.current.setPin("sku", "left"))

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
        orders: { columnPinning: { left: ["sku"], right: [] } },
      })
    })

    it("lets a persisted EMPTY state override a sticky declaration", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ orders: { columnPinning: { left: [], right: [] } } })
      )

      const { result } = setup({
        tableId: "orders",
        persistState: true,
        columns: [{ id: "sku", stickyLeft: true }],
      })

      expect(result.current.pinning).toEqual({ left: [], right: [] })
    })
  })

  it("reports each change exactly once", () => {
    const onColumnPinningChange = vi.fn()
    const { result } = setup({ onColumnPinningChange })

    act(() => result.current.setPin("sku", "left"))

    expect(onColumnPinningChange).toHaveBeenCalledTimes(1)
    expect(onColumnPinningChange).toHaveBeenCalledWith({
      left: ["sku"],
      right: [],
    })
  })
})
