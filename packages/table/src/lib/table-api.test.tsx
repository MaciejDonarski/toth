import { DataTable } from "../components/data-table/data-table"
import type { DataTableColumn } from "../components/data-table/data-table.types"
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { tableApi } from "./table-api"

interface Order {
  id: number
  sku: string
  qty: number
}

const columns: DataTableColumn<Order>[] = [
  { id: "sku", label: "SKU", isSortable: true },
  { id: "qty", label: "Qty", isSortable: true },
]

const rows: Order[] = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  sku: `sku-${index + 1}`,
  qty: 30 - index,
}))

function mount(id = "api-orders") {
  return render(
    <DataTable<Order>
      id={id}
      columns={columns}
      rows={rows}
      withSelection
      paginationOptions={{ pageSize: 10 }}
    />
  )
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  localStorage.clear()
  warn = vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
})

describe("tableApi", () => {
  describe("against a table that is not there", () => {
    it("returns undefined from a getter, and says why", () => {
      expect(tableApi.getSort("nope")).toBeUndefined()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"sort"'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nope"'))
    })

    it("does nothing from a setter, and says why", () => {
      expect(() => tableApi.setPage("nope", 2)).not.toThrow()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"pagination"'))
    })

    it("warns for a scope the table does not own", () => {
      mount("api-no-refresh")

      tableApi.refresh("api-no-refresh")

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"refresh"'))
    })

    it("stops reaching a table once it unmounts", () => {
      const { unmount } = mount("api-gone")
      unmount()

      expect(tableApi.getPagination("api-gone")).toBeUndefined()
    })
  })

  describe("against a mounted table", () => {
    it("reads and moves the page", () => {
      mount()

      expect(tableApi.getPagination("api-orders")).toMatchObject({
        currentPage: 1,
        totalPages: 3,
      })

      act(() => tableApi.setPage("api-orders", 3))

      expect(tableApi.getPagination("api-orders")?.currentPage).toBe(3)
      expect(screen.getByText("sku-21")).toBeInTheDocument()
    })

    it("sorts and resets the sort", () => {
      mount()

      act(() =>
        tableApi.setSort("api-orders", { columnId: "qty", direction: "asc" })
      )
      expect(screen.getAllByRole("row")[1]).toHaveTextContent("sku-30")

      act(() => tableApi.resetSort("api-orders"))
      expect(tableApi.getSort("api-orders")).toEqual({
        columnId: "",
        direction: "",
      })
    })

    it("selects rows and hands back the row objects", () => {
      mount()

      act(() => tableApi.toggleRow("api-orders", 2))
      act(() => tableApi.toggleRow("api-orders", 5))

      expect(tableApi.getSelection("api-orders")?.selectedIds).toEqual([2, 5])
      expect(
        tableApi.getSelectedRows<Order>("api-orders")?.map((row) => row.sku)
      ).toEqual(["sku-2", "sku-5"])
      expect(
        screen.getByRole("checkbox", { name: "Select row 2" })
      ).toBeChecked()

      act(() => tableApi.deselectAll("api-orders"))

      expect(tableApi.getSelection("api-orders")?.selectedIds).toEqual([])
    })

    it("hides a column", () => {
      mount()

      act(() => tableApi.setHiddenColumns("api-orders", ["qty"]))

      expect(tableApi.getColumnVisibility("api-orders")).toEqual({
        hiddenIds: ["qty"],
      })
      expect(screen.queryByRole("columnheader", { name: /Qty/ })).toBeNull()
    })

    it("reaches PlainTable's own scopes under the same id", () => {
      mount()

      expect(tableApi.getColumnAlign("api-orders", "sku")).toBe("left")

      act(() => tableApi.setColumnAlign("api-orders", "sku", "right"))

      expect(tableApi.getColumnAlign("api-orders", "sku")).toBe("right")
      expect(tableApi.getColumnAlign("api-orders")).toMatchObject({
        sku: "right",
      })
    })

    it("notifies a subscriber after a change, with the whole snapshot", () => {
      mount()
      const listener = vi.fn()
      const stop = tableApi.subscribe("api-orders", listener)

      act(() => tableApi.setPage("api-orders", 2))

      expect(listener).toHaveBeenCalled()
      expect(listener.mock.lastCall?.[0]).toMatchObject({
        pagination: expect.objectContaining({ currentPage: 2 }),
      })

      stop()
      listener.mockClear()
      act(() => tableApi.setPage("api-orders", 3))

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
