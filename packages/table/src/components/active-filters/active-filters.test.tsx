import { DataTableConfigProvider } from "../data-table/config-context"
import type { DataTableFilter, FilteringState } from "../../lib/filter-types"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataTableActiveFilters } from "./active-filters"

const filters: DataTableFilter[] = [
  { field: "sku", label: "SKU" },
  {
    field: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ],
  },
  { field: "createdAt", label: "Created", type: "datetime" },
]

function setup(
  filtering: FilteringState,
  props: Partial<Parameters<typeof DataTableActiveFilters>[0]> = {}
) {
  const onClearFilter = vi.fn()
  const onSetFilter = vi.fn()
  const onClearAll = vi.fn()

  const utils = render(
    <DataTableActiveFilters
      filters={filters}
      filtering={filtering}
      onClearFilter={onClearFilter}
      onSetFilter={onSetFilter}
      onClearAll={onClearAll}
      {...props}
    />
  )

  return { ...utils, onClearFilter, onSetFilter, onClearAll }
}

describe("DataTableActiveFilters", () => {
  it("renders nothing when nothing is set", () => {
    const { container } = setup({})

    expect(container).toBeEmptyDOMElement()
  })

  it("shows a chip with the option label, not the raw value", () => {
    setup({ status: { operator: "eq", value: "active" } })

    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  // A quiet band: a lead-in, then white chips of the table's own — not primary badges.
  it('leads with "Filtered by" and draws its own chips', () => {
    const { container } = setup({ sku: "widget" })

    expect(screen.getByText("Filtered by")).toBeInTheDocument()
    const chip = container.querySelector('[data-slot="active-filters-chip"]')
    expect(chip).toHaveTextContent("SKUwidget")
    expect(container.querySelector('[data-slot="badge"]')).toBeNull()
  })

  it("removes a filter entirely from its chip", async () => {
    const { onClearFilter } = setup({ sku: "widget" })

    await userEvent.click(
      screen.getByRole("button", { name: "Remove filter SKU" })
    )

    expect(onClearFilter).toHaveBeenCalledWith("sku")
  })

  it("offers Clear all only once there is more than one chip", () => {
    const { unmount } = setup({ sku: "widget" })
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull()
    unmount()

    setup({ sku: "widget", status: { operator: "eq", value: "active" } })
    expect(
      screen.getByRole("button", { name: "Clear all" })
    ).toBeInTheDocument()
  })

  describe("date formatting", () => {
    const filtering: FilteringState = {
      createdAt: { from: "2026-03-01 03:00:00", to: "2026-03-10 03:00:00" },
    }

    it("falls back to the `PP` format with no provider", () => {
      setup(filtering)

      expect(screen.getByText("Mar 1, 2026 – Mar 10, 2026")).toBeInTheDocument()
    })

    it("uses the app config when one is provided", () => {
      render(
        <DataTableConfigProvider config={{ dateFormat: "MM/dd/yyyy" }}>
          <DataTableActiveFilters
            filters={filters}
            filtering={filtering}
            onClearFilter={vi.fn()}
            onSetFilter={vi.fn()}
            onClearAll={vi.fn()}
          />
        </DataTableConfigProvider>
      )

      // A chip says the day even for a datetime filter.
      expect(screen.getByText("03/01/2026 – 03/10/2026")).toBeInTheDocument()
    })
  })
})
