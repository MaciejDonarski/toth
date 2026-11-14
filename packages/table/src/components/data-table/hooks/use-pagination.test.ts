import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { usePagination } from "./use-pagination"

const STORAGE_KEY = "toth-test-pagination"

const makeRows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1 }))

function setup(
  overrides: Partial<Parameters<typeof usePagination<{ id: number }>>[0]> = {}
) {
  return renderHook((props: typeof overrides = overrides) =>
    usePagination<{ id: number }>({
      storageKey: STORAGE_KEY,
      rows: makeRows(100),
      ...props,
    })
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe("usePagination", () => {
  it("opens on the first page at the default size", () => {
    const { result } = setup()

    expect(result.current.pagination).toEqual({
      currentPage: 1,
      pageSize: 25,
      totalItems: 100,
      totalPages: 4,
    })
  })

  it("slices the rows to the current page", () => {
    const { result } = setup()

    expect(result.current.paginatedRows.map((row) => row.id)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1)
    )

    act(() => result.current.goToPage(2))

    expect(result.current.paginatedRows[0]!.id).toBe(26)
    expect(result.current.paginatedRows).toHaveLength(25)
  })

  it("serves a short last page", () => {
    const { result } = setup({ rows: makeRows(30) })

    act(() => result.current.goToPage(2))

    expect(result.current.paginatedRows).toHaveLength(5)
  })

  it("clamps a page below the first", () => {
    const { result } = setup()

    act(() => result.current.goToPage(0))

    expect(result.current.pagination.currentPage).toBe(1)
  })

  it("clamps a page past the last", () => {
    const { result } = setup()

    act(() => result.current.goToPage(99))

    expect(result.current.pagination.currentPage).toBe(4)
  })

  it("reports one page for an empty result set rather than zero", () => {
    const { result } = setup({ rows: [] })

    expect(result.current.pagination.totalPages).toBe(1)
  })

  describe("page size", () => {
    it("takes an initial size from the options", () => {
      const { result } = setup({ paginationOptions: { pageSize: 10 } })

      expect(result.current.pagination.pageSize).toBe(10)
      expect(result.current.pagination.totalPages).toBe(10)
    })

    it("offers the default sizes, and the ones it was given", () => {
      expect(setup().result.current.sizes).toEqual([25, 50, 100, 150, 200, 500])
      expect(
        setup({ paginationOptions: { sizes: [10, 20] } }).result.current.sizes
      ).toEqual([10, 20])
    })

    it("returns to the first page when the size changes", () => {
      // Page 3 of 25 is a different set of rows from page 3 of 50, so keeping the number
      // would move the user somewhere they did not ask to go.
      const { result } = setup()

      act(() => result.current.goToPage(3))
      act(() => result.current.setPageSize(50))

      expect(result.current.pagination).toMatchObject({
        currentPage: 1,
        pageSize: 50,
      })
    })
  })

  describe("persistence", () => {
    it("persists the page size but never the page", () => {
      const { result } = setup({ tableId: "orders", persistState: true })

      act(() => result.current.goToPage(3))
      act(() => result.current.setPageSize(50))

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
        orders: { pagination: { pageSize: 50 } },
      })
    })

    it("opens at the persisted size, over the one in the options", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ orders: { pagination: { pageSize: 50 } } })
      )

      const { result } = setup({
        tableId: "orders",
        persistState: true,
        paginationOptions: { pageSize: 10 },
      })

      expect(result.current.pagination.pageSize).toBe(50)
    })

    it("writes nothing when persistence is off", () => {
      const { result } = setup({ tableId: "orders" })

      act(() => result.current.setPageSize(50))

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe("reporting", () => {
    it("reports a page change once, with the clamped page", () => {
      const onPageChange = vi.fn()
      const { result } = setup({ onPageChange })

      act(() => result.current.goToPage(99))

      expect(onPageChange).toHaveBeenCalledTimes(1)
      expect(onPageChange).toHaveBeenCalledWith(4)
    })

    it("reports a size change once", () => {
      const onPageSizeChange = vi.fn()
      const { result } = setup({ onPageSizeChange })

      act(() => result.current.setPageSize(50))

      expect(onPageSizeChange).toHaveBeenCalledTimes(1)
      expect(onPageSizeChange).toHaveBeenCalledWith(50)
    })

    it("says nothing when a filter resets the page", () => {
      // The reset is a consequence of the filter, not a navigation — reporting it would have
      // a consumer fetch the page it is already about to fetch.
      const onPageChange = vi.fn()
      const { result } = setup({ onPageChange })

      act(() => result.current.goToPage(3))
      onPageChange.mockClear()
      act(() => result.current.resetPage())

      expect(result.current.pagination.currentPage).toBe(1)
      expect(onPageChange).not.toHaveBeenCalled()
    })
  })

  describe("manual mode", () => {
    it("takes the total from the server and leaves the rows alone", () => {
      const page = makeRows(25)
      const { result } = setup({ manual: true, rows: page, totalItems: 500 })

      expect(result.current.pagination).toEqual({
        currentPage: 1,
        pageSize: 25,
        totalItems: 500,
        totalPages: 20,
      })
      expect(result.current.paginatedRows).toBe(page)
    })

    it("does not clamp while the server total is still unknown", () => {
      // On the first render of a manual table the total is 0 because nothing has been
      // fetched, not because there is nothing to fetch.
      const { result } = setup({ manual: true, rows: [], totalItems: 0 })

      act(() => result.current.goToPage(1))

      expect(result.current.pagination.currentPage).toBe(1)
    })
  })

  describe("shrinking result sets", () => {
    it("brings an out-of-range page back in when the rows narrow", () => {
      const { result, rerender } = setup()

      act(() => result.current.goToPage(4))
      expect(result.current.pagination.currentPage).toBe(4)

      rerender({ rows: makeRows(30) })

      expect(result.current.pagination.currentPage).toBe(2)
    })
  })
})
