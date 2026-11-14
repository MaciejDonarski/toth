import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useSelection } from "./use-selection"

interface Row {
  id: number
  sku: string
}

const allRows: Row[] = [
  { id: 1, sku: "a" },
  { id: 2, sku: "b" },
  { id: 3, sku: "c" },
  { id: 4, sku: "d" },
]

const page1 = allRows.slice(0, 2)
const page2 = allRows.slice(2)

const getRowId = (row: Row) => row.id

type Options = Parameters<typeof useSelection<Row>>[0]

function setup(overrides: Partial<Options> = {}) {
  return renderHook((props: Partial<Options> = overrides) =>
    useSelection<Row>({ allRows, visibleRows: page1, getRowId, ...props })
  )
}

describe("useSelection", () => {
  it("starts with nothing selected", () => {
    const { result } = setup()

    expect(result.current.selection).toEqual({
      selectedIds: [],
      selectedRows: [],
      mode: "ids",
      excludedIds: [],
    })
    expect(result.current.selectedCount).toBe(0)
  })

  it("toggles one row on and off", () => {
    const { result } = setup()

    act(() => result.current.toggleRow(2))
    expect(result.current.selection.selectedIds).toEqual([2])
    expect(result.current.isRowSelected(2)).toBe(true)

    act(() => result.current.toggleRow(2))
    expect(result.current.selection.selectedIds).toEqual([])
  })

  it("hands back the row objects, not just the ids", () => {
    const { result } = setup()

    act(() => result.current.toggleRow(2))

    expect(result.current.selection.selectedRows).toEqual([{ id: 2, sku: "b" }])
  })

  it("selects and deselects everything", () => {
    const { result } = setup()

    act(() => result.current.selectAll())
    expect(result.current.selection.selectedIds).toEqual([1, 2, 3, 4])
    expect(result.current.isAllSelected).toBe(true)

    act(() => result.current.deselectAll())
    expect(result.current.selection.selectedIds).toEqual([])
    expect(result.current.isAllSelected).toBe(false)
  })

  it("selects and deselects the current page only", () => {
    const { result } = setup()

    act(() => result.current.selectPage())
    expect(result.current.selection.selectedIds).toEqual([1, 2])
    expect(result.current.isPageSelected).toBe(true)

    act(() => result.current.deselectPage())
    expect(result.current.selection.selectedIds).toEqual([])
  })

  it("adds the page to an existing selection rather than replacing it", () => {
    const { result } = setup()

    act(() => result.current.toggleRow(4))
    act(() => result.current.selectPage())

    expect(result.current.selection.selectedIds.sort()).toEqual([1, 2, 4])
  })

  it("leaves rows off the page alone when deselecting the page", () => {
    const { result } = setup()

    act(() => result.current.selectAll())
    act(() => result.current.deselectPage())

    expect(result.current.selection.selectedIds).toEqual([3, 4])
  })

  it("reports a partly selected page", () => {
    const { result } = setup()

    act(() => result.current.toggleRow(1))

    expect(result.current.isPageSelected).toBe(false)
    expect(result.current.isPagePartiallySelected).toBe(true)
  })

  it("reports a partial selection made on another page", () => {
    // Row 4 is on page two; page one, which is showing, has nothing ticked on it.
    const { result } = setup()

    act(() => result.current.toggleRow(4))

    expect(result.current.isPagePartiallySelected).toBe(false)
    expect(result.current.isPartiallySelected).toBe(true)
  })

  it("is not partially selected once everything is", () => {
    const { result } = setup()

    act(() => result.current.selectAll())

    expect(result.current.isPartiallySelected).toBe(false)
  })

  it("takes a selection outright", () => {
    const { result } = setup()

    act(() => result.current.setSelectedIds([1, 3]))

    expect(result.current.selection.selectedIds).toEqual([1, 3])
    expect(result.current.selection.selectedRows.map((row) => row.sku)).toEqual(
      ["a", "c"]
    )
  })

  describe("excluded rows", () => {
    it("marks them unselectable", () => {
      const { result } = setup({ excludedIds: [3] })

      expect(result.current.isRowSelectable(3)).toBe(false)
      expect(result.current.isRowSelectable(1)).toBe(true)
    })

    it("skips them when selecting everything", () => {
      const { result } = setup({ excludedIds: [3] })

      act(() => result.current.selectAll())

      expect(result.current.selection.selectedIds).toEqual([1, 2, 4])
    })

    it("still counts the page as fully selected without them", () => {
      const { result } = setup({ visibleRows: page2, excludedIds: [3] })

      act(() => result.current.selectPage())

      expect(result.current.selection.selectedIds).toEqual([4])
      expect(result.current.isPageSelected).toBe(true)
    })
  })

  describe("reporting", () => {
    it("reports each change exactly once", () => {
      // The old hook called the consumer from inside a state updater, which React may run
      // twice for one commit.
      const onSelectedIdsChange = vi.fn()
      const { result } = setup({ onSelectedIdsChange })

      act(() => result.current.toggleRow(1))

      expect(onSelectedIdsChange).toHaveBeenCalledTimes(1)
      expect(onSelectedIdsChange).toHaveBeenCalledWith([1])
    })

    it("reports a page selection once", () => {
      const onSelectedIdsChange = vi.fn()
      const { result } = setup({ onSelectedIdsChange })

      act(() => result.current.selectPage())

      expect(onSelectedIdsChange).toHaveBeenCalledTimes(1)
    })
  })

  describe("manual mode", () => {
    it("offers no select-all, because the whole set is not in hand", () => {
      const { result } = setup({
        manual: true,
        allRows: page1,
        visibleRows: page1,
      })

      expect(result.current.canSelectAll).toBe(false)
      expect(result.current.isAllSelected).toBe(false)
    })

    it("keeps a selection made on one page while another is showing", () => {
      const { result, rerender } = setup({
        manual: true,
        allRows: page1,
        visibleRows: page1,
      })

      act(() => result.current.toggleRow(1))

      // Page two arrives: row 1 is nowhere in the data any more.
      rerender({ manual: true, allRows: page2, visibleRows: page2 })

      expect(result.current.selection.selectedIds).toEqual([1])
      expect(result.current.selection.selectedRows).toEqual([
        { id: 1, sku: "a" },
      ])
    })

    it("adds a row from the second page to one selected on the first", () => {
      const { result, rerender } = setup({
        manual: true,
        allRows: page1,
        visibleRows: page1,
      })

      act(() => result.current.toggleRow(1))
      rerender({ manual: true, allRows: page2, visibleRows: page2 })
      act(() => result.current.toggleRow(3))

      expect(result.current.selection.selectedIds.sort()).toEqual([1, 3])
      expect(
        result.current.selection.selectedRows.map((row) => row.sku).sort()
      ).toEqual(["a", "c"])
    })

    it("refreshes a cached row when it comes back on screen", () => {
      const { result, rerender } = setup({
        manual: true,
        allRows: page1,
        visibleRows: page1,
      })

      act(() => result.current.toggleRow(1))

      const edited = [{ id: 1, sku: "a-edited" }, page1[1]!]
      rerender({ manual: true, allRows: edited, visibleRows: edited })

      expect(result.current.selection.selectedRows).toEqual([
        { id: 1, sku: "a-edited" },
      ])
    })
  })

  describe("client-side mode", () => {
    it("reads the selected rows from the live data", () => {
      const { result, rerender } = setup()

      act(() => result.current.toggleRow(1))

      const edited = [{ id: 1, sku: "a-edited" }, ...allRows.slice(1)]
      rerender({ allRows: edited, visibleRows: edited.slice(0, 2) })

      expect(result.current.selection.selectedRows).toEqual([
        { id: 1, sku: "a-edited" },
      ])
    })

    it("keeps a selected row that a filter took out of the data", () => {
      // The id stays selected either way, so the row has to stay with it: handing back one
      // id and no row makes every caller that zips the two together wrong.
      const { result, rerender } = setup()

      act(() => result.current.toggleRow(4))
      rerender({ allRows: page1, visibleRows: page1 })

      expect(result.current.selection.selectedIds).toEqual([4])
      expect(result.current.selection.selectedRows).toEqual([
        { id: 4, sku: "d" },
      ])
    })
  })

  describe("selecting all matching, against a server", () => {
    // One page in hand, 67 rows on the server.
    function server(overrides: Partial<Options> = {}) {
      return setup({
        allRows: page1,
        visibleRows: page1,
        manual: true,
        totalItems: 67,
        selectAllMatching: true,
        ...overrides,
      })
    }

    it("is not on offer in manual mode unless asked for", () => {
      const { result } = setup({ allRows: page1, manual: true, totalItems: 67 })

      expect(result.current.canSelectAll).toBe(false)
    })

    it('switches to mode "all" and counts every match', () => {
      const { result } = server()

      act(() => result.current.selectAll())

      expect(result.current.canSelectAll).toBe(true)
      expect(result.current.selection.mode).toBe("all")
      expect(result.current.selection.excludedIds).toEqual([])
      expect(result.current.selectedCount).toBe(67)
      expect(result.current.isAllSelected).toBe(true)
      // The ids in hand are still listed, for whatever acts on the visible rows.
      expect(result.current.selection.selectedIds).toEqual([1, 2])
      expect(result.current.isRowSelected(1)).toBe(true)
    })

    it("remembers what was unticked, rather than what was ticked", () => {
      const { result } = server()

      act(() => result.current.selectAll())
      act(() => result.current.toggleRow(2))

      expect(result.current.selection.mode).toBe("all")
      expect(result.current.selection.excludedIds).toEqual([2])
      expect(result.current.selectedCount).toBe(66)
      expect(result.current.isAllSelected).toBe(false)
      expect(result.current.isRowSelected(2)).toBe(false)

      act(() => result.current.toggleRow(2))
      expect(result.current.selectedCount).toBe(67)
    })

    it("deselects and reselects a page within the mode", () => {
      const { result } = server()

      act(() => result.current.selectAll())
      act(() => result.current.deselectPage())

      expect(result.current.selection.excludedIds).toEqual([1, 2])
      expect(result.current.selectedCount).toBe(65)
      expect(result.current.isPageSelected).toBe(false)

      act(() => result.current.selectPage())
      expect(result.current.selectedCount).toBe(67)
      expect(result.current.isPageSelected).toBe(true)
    })

    it("goes back to a list of ids when everything is deselected", () => {
      const onSelectedIdsChange = vi.fn()
      const { result } = server({ onSelectedIdsChange })

      act(() => result.current.selectAll())
      expect(onSelectedIdsChange).toHaveBeenLastCalledWith([1, 2])

      act(() => result.current.deselectAll())
      expect(result.current.selection.mode).toBe("ids")
      expect(result.current.selectedCount).toBe(0)
      expect(onSelectedIdsChange).toHaveBeenLastCalledWith([])
    })

    it("covers rows of a page loaded afterwards", () => {
      const { result, rerender } = server()

      act(() => result.current.selectAll())
      rerender({
        allRows: page2,
        visibleRows: page2,
        manual: true,
        totalItems: 67,
        selectAllMatching: true,
      })

      expect(result.current.isRowSelected(3)).toBe(true)
      expect(result.current.isPageSelected).toBe(true)
    })
  })

  it("lets a client-side table opt out of select-all", () => {
    const { result } = setup({ selectAllMatching: false })

    expect(result.current.canSelectAll).toBe(false)
  })
})
