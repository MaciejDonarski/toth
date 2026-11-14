import type { DataTableFilter } from "../../../lib/filter-types"
import { buildSearchEntry, SEARCH_KEY } from "../../../lib/search-filtering"
import { act, renderHook } from "@testing-library/react"
import type * as React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useFilter } from "./use-filter"

const STORAGE_KEY = "toth-test-filter"

const filters: DataTableFilter[] = [
  { field: "sku" },
  { field: "state", type: "select", options: [], defaultValue: "active" },
]

type Options = Parameters<typeof useFilter>[0]

function setup(overrides: Partial<Options> = {}) {
  return renderHook(() =>
    useFilter({ storageKey: STORAGE_KEY, filters, ...overrides })
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe("useFilter", () => {
  it("opens seeded from the declared defaults", () => {
    const { result } = setup()

    expect(result.current.filtering).toEqual({
      state: { operator: "eq", value: "active" },
    })
  })

  it("opens empty when no filter declares a default", () => {
    const { result } = setup({ filters: [{ field: "sku" }] })

    expect(result.current.filtering).toEqual({})
  })

  it("takes a whole filtering state", () => {
    const { result } = setup()

    act(() => result.current.setFiltering({ sku: "ABC" }))

    expect(result.current.filtering).toEqual({ sku: "ABC" })
  })

  describe("search", () => {
    it("stores the term under its reserved key, beside the field filters", () => {
      const { result } = setup()

      act(() => result.current.setSearch("widget"))

      expect(result.current.filtering).toEqual({
        state: { operator: "eq", value: "active" },
        [SEARCH_KEY]: buildSearchEntry("widget"),
      })
    })

    it("drops the entry entirely when the term is cleared", () => {
      const { result } = setup()

      act(() => result.current.setSearch("widget"))
      act(() => result.current.setSearch(""))

      expect(result.current.filtering).not.toHaveProperty(SEARCH_KEY)
    })

    it("replaces the term rather than accumulating entries", () => {
      const { result } = setup()

      act(() => result.current.setSearch("one"))
      act(() => result.current.setSearch("two"))

      expect(result.current.filtering[SEARCH_KEY]).toEqual(
        buildSearchEntry("two")
      )
    })
  })

  describe("clearing", () => {
    it("clears one field and leaves the rest", () => {
      const { result } = setup()

      act(() =>
        result.current.setFiltering({ sku: "ABC", weight: { from: 1, to: 2 } })
      )
      act(() => result.current.clearFilter("sku"))

      expect(result.current.filtering).toEqual({ weight: { from: 1, to: 2 } })
    })

    it("clears the field filters but keeps the search term", () => {
      // The search box is a separate control; emptying it from inside the filter panel would
      // look like the panel had reached outside itself.
      const { result } = setup()

      act(() => result.current.setSearch("widget"))
      act(() => result.current.clearFilters())

      expect(result.current.filtering).toEqual({
        [SEARCH_KEY]: buildSearchEntry("widget"),
      })
    })

    it("clears everything, search included", () => {
      const { result } = setup()

      act(() => result.current.setSearch("widget"))
      act(() => result.current.clearAll())

      expect(result.current.filtering).toEqual({})
    })
  })

  describe("page reset", () => {
    it("sends the table back to the first page on every change", () => {
      // A narrower result set invalidates whatever page the user was on.
      const resetPage = vi.fn()
      const resetPageRef = { current: resetPage }
      const { result } = setup({ resetPageRef })

      act(() => result.current.setFiltering({ sku: "ABC" }))
      expect(resetPage).toHaveBeenCalledTimes(1)

      act(() => result.current.setSearch("widget"))
      expect(resetPage).toHaveBeenCalledTimes(2)

      act(() => result.current.clearAll())
      expect(resetPage).toHaveBeenCalledTimes(3)
    })

    it("does not reset on the initial render", () => {
      const resetPage = vi.fn()
      setup({ resetPageRef: { current: resetPage } })

      expect(resetPage).not.toHaveBeenCalled()
    })

    it("survives a ref that has not been filled in yet", () => {
      const { result } = setup({
        resetPageRef: { current: null } as React.RefObject<(() => void) | null>,
      })

      expect(() =>
        act(() => result.current.setFiltering({ sku: "A" }))
      ).not.toThrow()
    })
  })

  describe("persistence", () => {
    it("writes the filtering under the table id", () => {
      const { result } = setup({ tableId: "orders", persistState: true })

      act(() => result.current.setFiltering({ sku: "ABC" }))

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
        orders: { filtering: { sku: "ABC" } },
      })
    })

    it("opens from the persisted state, ignoring the declared defaults", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ orders: { filtering: { sku: "STORED" } } })
      )

      const { result } = setup({ tableId: "orders", persistState: true })

      expect(result.current.filtering).toEqual({ sku: "STORED" })
    })

    it("writes nothing when persistence is off", () => {
      const { result } = setup({ tableId: "orders" })

      act(() => result.current.setFiltering({ sku: "ABC" }))

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe("reporting", () => {
    it("reports each change once, after sanitizing it", () => {
      const onFilteringChange = vi.fn()
      const { result } = setup({ onFilteringChange })

      act(() => result.current.setSearch("   "))

      expect(onFilteringChange).toHaveBeenCalledTimes(1)
      // The blank term never reaches the consumer: left in, it would go out in the server
      // payload and change the refetch key for nothing.
      expect(onFilteringChange).toHaveBeenCalledWith({
        state: { operator: "eq", value: "active" },
      })
    })
  })
})
