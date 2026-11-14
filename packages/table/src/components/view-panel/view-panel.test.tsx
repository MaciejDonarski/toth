import type { DataTableColumn } from "../data-table/data-table.types"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataTableViewPanel, DataTableViewPanelSection } from "./view-panel"

const columns: DataTableColumn<unknown>[] = [
  { id: "reference", label: "Reference" },
  { id: "customer", label: "Customer", isHidden: true },
  { id: "total", label: "Total" },
]

function setup(props: Partial<Parameters<typeof DataTableViewPanel>[0]> = {}) {
  const handlers = {
    onDensityChange: vi.fn(),
    onColumnDividersChange: vi.fn(),
    onToggleColumn: vi.fn(),
    onReorder: vi.fn(),
    onReset: vi.fn(),
  }
  render(<DataTableViewPanel columns={columns} {...handlers} {...props} />)
  return handlers
}

describe("DataTableViewPanel", () => {
  it("lists the sections in order", () => {
    setup({
      sections: (
        <DataTableViewPanelSection title="Auto-refresh">
          …
        </DataTableViewPanelSection>
      ),
    })

    const titles = screen
      .getAllByRole("heading")
      .map((heading) => heading.textContent)
    expect(titles).toEqual([
      "Density",
      "Auto-refresh",
      "Columns · 2 of 3 shown",
    ])
    expect(screen.getByText("Vertical lines between cells")).toBeInTheDocument()
  })

  it("reports density and dividers", async () => {
    const { onDensityChange, onColumnDividersChange } = setup()

    await userEvent.click(screen.getByRole("button", { name: "Compact" }))
    await userEvent.click(screen.getByRole("switch"))

    expect(onDensityChange).toHaveBeenCalledWith("compact")
    expect(onColumnDividersChange).toHaveBeenCalledWith(true)
  })

  it("shows a column’s visibility and notes where it is pinned", () => {
    setup({ getPinSide: (id) => (id === "reference" ? "left" : false) })

    const rows = screen.getAllByRole("listitem")
    expect(within(rows[0]!).getByRole("checkbox")).toHaveAttribute(
      "aria-checked",
      "true"
    )
    expect(within(rows[1]!).getByRole("checkbox")).toHaveAttribute(
      "aria-checked",
      "false"
    )
    expect(rows[0]).toHaveTextContent("· pinned left")
  })

  it("moves a column down and emits the whole order", async () => {
    const { onReorder } = setup({ withReorder: true })

    await userEvent.click(
      screen.getByRole("button", { name: "Move Reference down" })
    )

    expect(onReorder).toHaveBeenCalledWith(["customer", "reference", "total"])
    expect(
      screen.getByRole("button", { name: "Move Total down" })
    ).toBeDisabled()
  })

  it("resets the view", async () => {
    const { onReset } = setup()

    await userEvent.click(
      screen.getByRole("button", { name: "Reset to default view" })
    )

    expect(onReset).toHaveBeenCalled()
  })
})
