import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DataTableColumn } from "../data-table.types"
import { useColumnsVisibility } from "./use-columns-visibility"

interface Row {
  sku: string
}

const columns: DataTableColumn<Row>[] = [
  { id: "sku" },
  { id: "qty" },
  { id: "notes" },
]

const STORAGE_KEY = "toth-test-columns-visibility"

type Options = Parameters<typeof useColumnsVisibility<Row>>[0]

function setup(overrides: Partial<Options> = {}) {
  return renderHook(() =>
    useColumnsVisibility<Row>({
      storageKey: STORAGE_KEY,
      columns,
      ...overrides,
    })
  )
}

const ids = (list: DataTableColumn<Row>[]) => list.map((column) => column.id)

beforeEach(() => {
  localStorage.clear()
})

describe("useColumnsVisibility", () => {
  it("shows every column by default", () => {
    const { result } = setup()

    expect(ids(result.current.visibleColumns)).toEqual(["sku", "qty", "notes"])
    expect(result.current.hiddenColumnIds).toEqual([])
  })

  it("hides a column a declaration marks hidden", () => {
    const { result } = setup({
      columns: [{ id: "sku" }, { id: "notes", isHidden: true }],
    })

    expect(ids(result.current.visibleColumns)).toEqual(["sku"])
    expect(result.current.isColumnHidden("notes")).toBe(true)
  })

  it("toggles a column out and back", () => {
    const { result } = setup()

    act(() => result.current.toggleColumn("qty"))
    expect(ids(result.current.visibleColumns)).toEqual(["sku", "notes"])

    act(() => result.current.toggleColumn("qty"))
    expect(ids(result.current.visibleColumns)).toEqual(["sku", "qty", "notes"])
  })

  it("takes a hidden list outright", () => {
    const { result } = setup()

    act(() => result.current.setHidden(["sku", "notes"]))

    expect(ids(result.current.visibleColumns)).toEqual(["qty"])
  })

  it("reports every column with whether it is hidden, for the panel to list", () => {
    const { result } = setup()

    act(() => result.current.toggleColumn("qty"))

    expect(
      result.current.columnsWithVisibility.map((column) => [
        column.id,
        column.isHidden,
      ])
    ).toEqual([
      ["sku", false],
      ["qty", true],
      ["notes", false],
    ])
  })

  it("keeps the visible id array identical while its contents do not change", () => {
    // The async table's "does showing this column need a refetch?" check depends on this list;
    // a fresh array every render would make it fire on every render.
    const { rerender, result } = setup()
    const first = result.current.visibleColumnIds

    rerender()

    expect(result.current.visibleColumnIds).toBe(first)
  })

  it("returns a new visible id array once the contents do change", () => {
    const { result } = setup()
    const first = result.current.visibleColumnIds

    act(() => result.current.toggleColumn("qty"))

    expect(result.current.visibleColumnIds).not.toBe(first)
    expect(result.current.visibleColumnIds).toEqual(["sku", "notes"])
  })

  describe("persistence", () => {
    it("writes the hidden ids under the table id", () => {
      const { result } = setup({ tableId: "orders", persistState: true })

      act(() => result.current.toggleColumn("qty"))

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
        orders: { columnVisibility: { hiddenIds: ["qty"] } },
      })
    })

    it("lets a persisted EMPTY list override a column declared hidden", () => {
      // The emptiness is the point: it means the user has unhidden everything, and
      // re-seeding from `isHidden` would hide the column again on every reload.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ orders: { columnVisibility: { hiddenIds: [] } } })
      )

      const { result } = setup({
        tableId: "orders",
        persistState: true,
        columns: [{ id: "sku" }, { id: "notes", isHidden: true }],
      })

      expect(ids(result.current.visibleColumns)).toEqual(["sku", "notes"])
    })

    it("seeds from the declarations when nothing is persisted", () => {
      const { result } = setup({
        tableId: "orders",
        persistState: true,
        columns: [{ id: "sku" }, { id: "notes", isHidden: true }],
      })

      expect(ids(result.current.visibleColumns)).toEqual(["sku"])
    })
  })

  it("reports each change exactly once", () => {
    const onColumnVisibilityChange = vi.fn()
    const { result } = setup({ onColumnVisibilityChange })

    act(() => result.current.toggleColumn("qty"))

    expect(onColumnVisibilityChange).toHaveBeenCalledTimes(1)
    expect(onColumnVisibilityChange).toHaveBeenCalledWith({
      hiddenIds: ["qty"],
    })
  })
})
