import type { PaginationState } from "../../lib/table-state"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DataTableFooter } from "./table-footer"

const pagination: PaginationState = {
  currentPage: 1,
  pageSize: 25,
  totalItems: 67,
  totalPages: 3,
}

function setup(props: Partial<Parameters<typeof DataTableFooter>[0]> = {}) {
  const utils = render(
    <DataTableFooter
      pagination={pagination}
      sizes={[25, 50]}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      {...props}
    />
  )

  return {
    ...utils,
    summary: () =>
      utils.container.querySelector('[data-slot="table-footer-summary"]'),
  }
}

describe("DataTableFooter", () => {
  it("says which rows are on screen, out of how many", () => {
    const { summary } = setup()

    expect(summary()).toHaveTextContent("1–25 of 67 entries")
  })

  it("calls the rows what the caller calls them", () => {
    const { summary } = setup({ itemsLabel: "orders" })

    expect(summary()).toHaveTextContent("1–25 of 67 orders")
  })

  it("stops the range at the last row on the last page", () => {
    const { summary } = setup({ pagination: { ...pagination, currentPage: 3 } })

    expect(summary()).toHaveTextContent("51–67 of 67 entries")
  })

  it("appends the selection after a middle dot, only when there is one", () => {
    const { summary, unmount } = setup()
    expect(summary()).not.toHaveTextContent("selected")
    unmount()

    const again = setup({ selectedCount: 3 })
    expect(again.summary()).toHaveTextContent("1–25 of 67 entries · 3 selected")
  })

  it("appends whatever the caller adds, after the selection", () => {
    const { summary } = setup({ selectedCount: 1, extra: "updated 14:32:05" })

    expect(summary()).toHaveTextContent("1 selected · updated 14:32:05")
  })

  it('labels the page size "Rows" and names the select in full', () => {
    setup()

    expect(screen.getByText("Rows")).toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "Rows per page" })
    ).toBeInTheDocument()
  })

  it("marks the footer band with its slot", () => {
    const { container } = setup()

    expect(
      container.querySelector('[data-slot="table-footer"]')
    ).toBeInTheDocument()
  })
})
