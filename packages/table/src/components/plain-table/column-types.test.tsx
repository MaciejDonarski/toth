import { DataTableConfigProvider } from "../data-table/config-context"
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { PlainTable } from "./plain-table"
import type { PlainTableCellProps, PlainTableColumn } from "./types"

// What `column.type` is worth: the right cell and the right alignment without a `template`, and
// getting out of the way the moment a column states either for itself.

type Row = {
  id: string
  createdAt: string
  total: number
}

const rows: Row[] = [
  { id: "a", createdAt: "2026-03-01 03:00:00", total: 1234567.5 },
]

const CONFIG = {
  dateFormat: "MM/dd/yyyy",
  dateTimeFormat: "MM/dd/yyyy hh:mm a",
}

function renderTable(
  columns: PlainTableColumn<Row>[],
  data: Row[] = rows,
  withConfig = false
) {
  const table = <PlainTable columns={columns} rows={data} />

  return render(
    withConfig ? (
      <DataTableConfigProvider config={CONFIG}>{table}</DataTableConfigProvider>
    ) : (
      table
    )
  )
}

function cell(columnId: string) {
  return document.querySelector(`td[data-id="${columnId}"]`)
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe("column type", () => {
  // ===================== alignment =====================

  describe("alignment", () => {
    it("aligns a number column right, header and body alike", () => {
      renderTable([{ id: "total", label: "Total", type: "number" }])

      expect(
        screen.getByRole("columnheader", { name: /Total/ })
      ).toHaveAttribute("data-align", "right")
      expect(cell("total")).toHaveAttribute("data-align", "right")
    })

    it("lets the column's own align beat the one its type implies", () => {
      renderTable([
        { id: "total", label: "Total", type: "number", align: "left" },
      ])

      expect(cell("total")).toHaveAttribute("data-align", "left")
    })

    it("leaves date and datetime columns at the default alignment", () => {
      renderTable([{ id: "createdAt", label: "Created", type: "datetime" }])

      expect(cell("createdAt")).toHaveAttribute("data-align", "left")
    })
  })

  // ===================== numbers =====================

  describe("number", () => {
    it("shows two decimals, grouped", () => {
      renderTable([{ id: "total", label: "Total", type: "number" }])

      // Whichever separators this runtime's locale uses, the digits and their grouping are
      // the same — so the separators themselves are normalized away rather than pinned.
      expect(cell("total")?.textContent?.replace(/[\s,.]/gu, "")).toBe(
        "123456750"
      )
    })

    it("reads a numeric string, which is how a big decimal survives JSON", () => {
      renderTable(
        [{ id: "total", label: "Total", type: "number" }],
        [{ id: "a", createdAt: "", total: "12.5" as unknown as number }]
      )

      // "1250", not "125": the two decimals are there, whatever separates them.
      expect(cell("total")?.textContent?.replace(/[\s,.]/gu, "")).toBe("1250")
    })

    it("shows a value it cannot read as a number verbatim, rather than dropping it", () => {
      renderTable(
        [{ id: "total", label: "Total", type: "number" }],
        [{ id: "a", createdAt: "", total: "n/a" as unknown as number }]
      )

      expect(cell("total")).toHaveTextContent("n/a")
    })

    it("leaves an absent value blank", () => {
      renderTable(
        [{ id: "total", label: "Total", type: "number" }],
        [{ id: "a", createdAt: "", total: null as unknown as number }]
      )

      expect(cell("total")).toBeEmptyDOMElement()
    })
  })

  // ===================== dates =====================

  describe("date and datetime", () => {
    // A value without an offset is local time; the provider's date-fns patterns decide the shape.
    it("writes a date in the provider's format", () => {
      renderTable(
        [{ id: "createdAt", label: "Created", type: "date" }],
        rows,
        true
      )

      expect(cell("createdAt")).toHaveTextContent("03/01/2026")
    })

    it("writes a datetime in the provider's format", () => {
      renderTable(
        [{ id: "createdAt", label: "Created", type: "datetime" }],
        rows,
        true
      )

      expect(cell("createdAt")).toHaveTextContent("03/01/2026 03:00 AM")
    })

    it("falls back to the `PP` format with no provider", () => {
      renderTable([{ id: "createdAt", label: "Created", type: "date" }])

      expect(cell("createdAt")).toHaveTextContent("Mar 1, 2026")
    })

    it("formats a Date the data layer already parsed", () => {
      renderTable(
        [{ id: "createdAt", label: "Created", type: "date" }],
        [
          {
            id: "a",
            createdAt: new Date(2026, 1, 28, 12) as unknown as string,
            total: 0,
          },
        ],
        true
      )

      expect(cell("createdAt")).toHaveTextContent("02/28/2026")
    })

    it("shows a value that will not parse verbatim", () => {
      renderTable(
        [{ id: "createdAt", label: "Created", type: "date" }],
        [{ id: "a", createdAt: "whenever", total: 0 }],
        true
      )

      expect(cell("createdAt")).toHaveTextContent("whenever")
    })
  })

  // ===================== precedence =====================

  describe("precedence", () => {
    it("lets the column's own template beat the one its type implies", () => {
      function Custom({ row }: PlainTableCellProps<Row>) {
        return <span>custom {row.id}</span>
      }

      renderTable(
        [{ id: "createdAt", label: "Created", type: "date", template: Custom }],
        rows,
        true
      )

      expect(cell("createdAt")).toHaveTextContent("custom a")
    })

    it("beats the table-wide cell slot, which is the less specific of the two", () => {
      function SlotCell() {
        return <span>slot</span>
      }

      render(
        <DataTableConfigProvider config={CONFIG}>
          <PlainTable
            columns={[
              { id: "createdAt", label: "Created", type: "date" },
              { id: "id", label: "Id" },
            ]}
            rows={rows}
            slots={{ cell: SlotCell }}
          />
        </DataTableConfigProvider>
      )

      expect(cell("createdAt")).toHaveTextContent("03/01/2026")
      expect(cell("id")).toHaveTextContent("slot")
    })
  })
})
