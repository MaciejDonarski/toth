import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DataTableColumn } from "../data-table.types"
import { useSort } from "./use-sort"

interface Row {
  sku: string
  qty: number
  customer: { city: string }
}

const columns: DataTableColumn<Row>[] = [
  { id: "sku", isSortable: true },
  { id: "qty", isSortable: true },
  { id: "customer.city", isSortable: true },
]

const rows: Row[] = [
  { sku: "item-10", qty: 3, customer: { city: "Kraków" } },
  { sku: "item-2", qty: 30, customer: { city: "Gdańsk" } },
  { sku: "item-1", qty: 2, customer: { city: "Łódź" } },
]

const STORAGE_KEY = "toth-test-sort"

function setup(overrides: Partial<Parameters<typeof useSort<Row>>[0]> = {}) {
  return renderHook(() =>
    useSort<Row>({ storageKey: STORAGE_KEY, columns, rows, ...overrides })
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe("useSort", () => {
  it("starts unsorted", () => {
    const { result } = setup()

    expect(result.current.sort).toEqual({ columnId: "", direction: "" })
    expect(result.current.sortedRows).toEqual(rows)
  })

  it("walks ascending, descending, off", () => {
    const { result } = setup()

    act(() => result.current.onSort("sku"))
    expect(result.current.sort).toEqual({ columnId: "sku", direction: "asc" })

    act(() => result.current.onSort("sku"))
    expect(result.current.sort).toEqual({ columnId: "sku", direction: "desc" })

    act(() => result.current.onSort("sku"))
    expect(result.current.sort).toEqual({ columnId: "", direction: "" })
  })

  it("starts a fresh ascending sort on a different column", () => {
    const { result } = setup()

    act(() => result.current.onSort("sku"))
    act(() => result.current.onSort("sku"))
    act(() => result.current.onSort("qty"))

    expect(result.current.sort).toEqual({ columnId: "qty", direction: "asc" })
  })

  it("sorts text with natural number ordering", () => {
    const { result } = setup()

    act(() => result.current.onSort("sku"))

    expect(result.current.sortedRows.map((row) => row.sku)).toEqual([
      "item-1",
      "item-2",
      "item-10",
    ])
  })

  it("sorts numbers numerically", () => {
    const { result } = setup()

    act(() => result.current.onSort("qty"))

    expect(result.current.sortedRows.map((row) => row.qty)).toEqual([2, 3, 30])
  })

  it("reverses on the descending step", () => {
    const { result } = setup()

    act(() => result.current.onSort("qty"))
    act(() => result.current.onSort("qty"))

    expect(result.current.sortedRows.map((row) => row.qty)).toEqual([30, 3, 2])
  })

  it("sorts on a dotted column id, reading the nested value", () => {
    // The old hook indexed the row directly, so every dotted column sorted by `undefined` —
    // which is to say it did not sort at all.
    const { result } = setup()

    act(() => result.current.onSort("customer.city"))

    expect(result.current.sortedRows.map((row) => row.customer.city)).toEqual([
      "Gdańsk",
      "Kraków",
      "Łódź",
    ])
  })

  it("leaves the original rows untouched", () => {
    const original = [...rows]
    const { result } = setup()

    act(() => result.current.onSort("qty"))

    expect(rows).toEqual(original)
  })

  describe("blanks", () => {
    const sparse: Row[] = [
      { sku: "b", qty: 1, customer: { city: "" } },
      { sku: "", qty: 2, customer: { city: "" } },
      { sku: "a", qty: 3, customer: { city: "" } },
    ]

    it("sorts blanks last ascending", () => {
      const { result } = setup({ rows: sparse })

      act(() => result.current.onSort("sku"))

      expect(result.current.sortedRows.map((row) => row.sku)).toEqual([
        "a",
        "b",
        "",
      ])
    })

    it("keeps blanks last descending too", () => {
      // A missing value is not the smallest value: flipping the direction should not bring a
      // page of empty cells to the top.
      const { result } = setup({ rows: sparse })

      act(() => result.current.onSort("sku"))
      act(() => result.current.onSort("sku"))

      expect(result.current.sortedRows.map((row) => row.sku)).toEqual([
        "b",
        "a",
        "",
      ])
    })
  })

  describe("manual mode", () => {
    it("tracks the state but leaves the order to the server", () => {
      const { result } = setup({ manual: true })

      act(() => result.current.onSort("qty"))

      expect(result.current.sort).toEqual({ columnId: "qty", direction: "asc" })
      expect(result.current.sortedRows).toEqual(rows)
    })
  })

  describe("initial sort", () => {
    it("seeds from a column that declares sortDir", () => {
      const { result } = setup({
        columns: [{ id: "sku" }, { id: "qty", sortDir: "desc" }],
      })

      expect(result.current.sort).toEqual({
        columnId: "qty",
        direction: "desc",
      })
    })

    it("prefers sortOptions.defaultSort over a column flag", () => {
      const { result } = setup({
        columns: [{ id: "qty", sortDir: "desc" }],
        sortOptions: { defaultSort: { columnId: "sku", direction: "asc" } },
      })

      expect(result.current.sort).toEqual({ columnId: "sku", direction: "asc" })
    })

    it("prefers persisted state over both", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          orders: { sort: { columnId: "qty", direction: "asc" } },
        })
      )

      const { result } = setup({
        tableId: "orders",
        persistState: true,
        columns: [{ id: "sku", sortDir: "desc" }],
        sortOptions: { defaultSort: { columnId: "sku", direction: "desc" } },
      })

      expect(result.current.sort).toEqual({ columnId: "qty", direction: "asc" })
    })

    it("ignores a persisted state that is missing a direction", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ orders: { sort: { columnId: "qty", direction: "" } } })
      )

      const { result } = setup({
        tableId: "orders",
        persistState: true,
        columns: [{ id: "sku", sortDir: "desc" }],
      })

      expect(result.current.sort).toEqual({
        columnId: "sku",
        direction: "desc",
      })
    })
  })

  describe("persistence", () => {
    it("writes the sort under the table id", () => {
      const { result } = setup({ tableId: "orders", persistState: true })

      act(() => result.current.onSort("sku"))

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
        orders: { sort: { columnId: "sku", direction: "asc" } },
      })
    })

    it("writes nothing when persistence is off", () => {
      const { result } = setup({ tableId: "orders" })

      act(() => result.current.onSort("sku"))

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe("reporting", () => {
    it("reports each change exactly once", () => {
      // The old hook called the consumer from inside a state updater, which React may run
      // twice for one commit — so a consumer refetching on sort refetched twice per click.
      const onSortChange = vi.fn()
      const { result } = setup({ onSortChange })

      act(() => result.current.onSort("sku"))

      expect(onSortChange).toHaveBeenCalledTimes(1)
      expect(onSortChange).toHaveBeenCalledWith({
        columnId: "sku",
        direction: "asc",
      })
    })

    it("reports a reset", () => {
      const onSortChange = vi.fn()
      const { result } = setup({ onSortChange })

      act(() => result.current.onSort("sku"))
      act(() => result.current.reset())

      expect(onSortChange).toHaveBeenLastCalledWith({
        columnId: "",
        direction: "",
      })
    })
  })

  describe("setSort", () => {
    it("takes a state outright", () => {
      const { result } = setup()

      act(() => result.current.setSort({ columnId: "qty", direction: "desc" }))

      expect(result.current.sort).toEqual({
        columnId: "qty",
        direction: "desc",
      })
    })

    it("collapses a column without a direction to no sort at all", () => {
      const { result } = setup()

      act(() => result.current.setSort({ columnId: "qty", direction: "" }))

      expect(result.current.sort).toEqual({ columnId: "", direction: "" })
    })
  })

  describe("getSortDirection", () => {
    it("answers only for the sorted column", () => {
      const { result } = setup()

      act(() => result.current.onSort("sku"))

      expect(result.current.getSortDirection("sku")).toBe("asc")
      expect(result.current.getSortDirection("qty")).toBe("")
    })
  })
})
