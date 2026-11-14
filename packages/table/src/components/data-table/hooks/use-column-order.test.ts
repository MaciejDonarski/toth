import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DataTableColumn } from "../data-table.types"
import { useColumnOrder } from "./use-column-order"

interface Row {
  sku: string
}

const columns: DataTableColumn<Row>[] = [
  { id: "sku" },
  { id: "qty" },
  { id: "notes" },
]

const STORAGE_KEY = "toth-test-column-order"

type Options = Parameters<typeof useColumnOrder<Row>>[0]

function setup(overrides: Partial<Options> = {}) {
  return renderHook(() =>
    useColumnOrder<Row>({ storageKey: STORAGE_KEY, columns, ...overrides })
  )
}

const ids = (list: DataTableColumn<Row>[]) => list.map((column) => column.id)

beforeEach(() => {
  localStorage.clear()
})

describe("useColumnOrder", () => {
  it("leaves the declared order alone until something is set", () => {
    const { result } = setup()

    expect(result.current.order).toEqual([])
    expect(result.current.orderedColumns).toBe(columns)
  })

  it("reorders to match the list it is given", () => {
    const { result } = setup()

    act(() => result.current.setOrder(["notes", "sku", "qty"]))

    expect(ids(result.current.orderedColumns)).toEqual(["notes", "sku", "qty"])
  })

  it("puts a column the saved order does not mention after the ones it does", () => {
    // A column added in a later release: the saved order stays usable instead of having to be
    // thrown away.
    const { result } = setup()

    act(() => result.current.setOrder(["notes", "sku"]))

    expect(ids(result.current.orderedColumns)).toEqual(["notes", "sku", "qty"])
  })

  it("keeps several unmentioned columns in their declared order", () => {
    const { result } = setup({
      columns: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    })

    act(() => result.current.setOrder(["d"]))

    expect(ids(result.current.orderedColumns)).toEqual(["d", "a", "b", "c"])
  })

  it("ignores an id in the order that no longer exists", () => {
    const { result } = setup()

    act(() => result.current.setOrder(["gone", "notes", "sku", "qty"]))

    expect(ids(result.current.orderedColumns)).toEqual(["notes", "sku", "qty"])
  })

  it("does not mutate the columns it was given", () => {
    const original = ids(columns)
    const { result } = setup()

    act(() => result.current.setOrder(["notes", "qty", "sku"]))

    expect(ids(columns)).toEqual(original)
  })

  describe("persistence", () => {
    it("writes the order under the table id", () => {
      const { result } = setup({ tableId: "orders", persistState: true })

      act(() => result.current.setOrder(["qty", "sku"]))

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
        orders: { columnOrder: { order: ["qty", "sku"] } },
      })
    })

    it("opens in the persisted order", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          orders: { columnOrder: { order: ["notes", "qty", "sku"] } },
        })
      )

      const { result } = setup({ tableId: "orders", persistState: true })

      expect(ids(result.current.orderedColumns)).toEqual([
        "notes",
        "qty",
        "sku",
      ])
    })
  })

  it("reports each change exactly once", () => {
    const onColumnOrderChange = vi.fn()
    const { result } = setup({ onColumnOrderChange })

    act(() => result.current.setOrder(["qty", "sku", "notes"]))

    expect(onColumnOrderChange).toHaveBeenCalledTimes(1)
    expect(onColumnOrderChange).toHaveBeenCalledWith({
      order: ["qty", "sku", "notes"],
    })
  })
})
