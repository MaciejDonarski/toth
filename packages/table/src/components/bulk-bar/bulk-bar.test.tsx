import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataTableBulkBar } from "./bulk-bar"

describe("DataTableBulkBar", () => {
  it("is a labelled region on its slot, announcing the count", () => {
    render(<DataTableBulkBar selectedCount={3} onClear={vi.fn()} />)

    const bar = screen.getByRole("region", { name: "Selection" })
    expect(bar).toHaveAttribute("data-slot", "bulk-bar")
    expect(screen.getByText("3 selected")).toHaveAttribute(
      "aria-live",
      "polite"
    )
  })

  it('offers "Select all N matching" only where allowed and not already done', () => {
    const { rerender } = render(
      <DataTableBulkBar
        selectedCount={3}
        totalCount={67}
        canSelectAll
        onSelectAll={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(
      screen.getByRole("button", { name: "Select all 67 matching" })
    ).toBeInTheDocument()

    rerender(
      <DataTableBulkBar
        selectedCount={67}
        totalCount={67}
        canSelectAll
        isAllSelected
        onSelectAll={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(screen.queryByRole("button", { name: /matching/ })).toBeNull()

    rerender(
      <DataTableBulkBar selectedCount={3} totalCount={67} onClear={vi.fn()} />
    )
    expect(screen.queryByRole("button", { name: /matching/ })).toBeNull()
  })

  it("clears from the link and from the close button", async () => {
    const onClear = vi.fn()
    render(<DataTableBulkBar selectedCount={1} onClear={onClear} />)

    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    await userEvent.click(
      screen.getByRole("button", { name: "Clear selection" })
    )

    expect(onClear).toHaveBeenCalledTimes(2)
  })

  it("draws its actions as buttons unless one asks for the menu", () => {
    render(
      <DataTableBulkBar
        selectedCount={1}
        onClear={vi.fn()}
        actions={[
          { label: "Print labels", onClick: vi.fn() },
          { label: "Archive", onClick: vi.fn(), standalone: false },
        ]}
      />
    )

    expect(
      screen.getByRole("button", { name: "Print labels" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull()
    expect(
      screen.getByRole("button", { name: "More selection actions" })
    ).toBeInTheDocument()
  })
})
