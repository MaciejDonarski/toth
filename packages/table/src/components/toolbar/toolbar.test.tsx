import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataTableToolbar } from "./toolbar"

const five = [
  "Print pick lists",
  "Import",
  "Sync channels",
  "Archive shipped",
  "Export",
].map((label) => ({ label, onClick: vi.fn() }))

describe("DataTableToolbar", () => {
  it("puts search and the view controls first, and the table actions after a spacer", () => {
    const { container } = render(
      <DataTableToolbar
        search={<input aria-label="Search" />}
        rightActions={[
          { label: "Filters", standalone: true, onClick: vi.fn() },
        ]}
        actions={[{ label: "Export", onClick: vi.fn() }]}
      />
    )

    const order = [
      ...container.querySelectorAll('[data-slot="toolbar"] > *'),
    ].map((element) => element.getAttribute("data-slot"))
    expect(order).toEqual([
      "toolbar-search",
      "toolbar-view",
      "toolbar-spacer",
      "toolbar-actions",
    ])
  })

  it('draws two table actions as buttons and moves the rest to "More table actions"', async () => {
    render(<DataTableToolbar actions={five} />)

    const group = screen.getByRole("group", { name: "Table actions" })
    expect(
      within(group).getByRole("button", { name: "Print pick lists" })
    ).toBeInTheDocument()
    expect(
      within(group).getByRole("button", { name: "Import" })
    ).toBeInTheDocument()
    expect(
      within(group).queryByRole("button", { name: "Sync channels" })
    ).toBeNull()

    await userEvent.click(
      screen.getByRole("button", { name: "More table actions" })
    )
    const items = (await screen.findAllByRole("menuitem")).map(
      (item) => item.textContent
    )
    expect(items).toEqual(["Sync channels", "Archive shipped", "Export"])
  })

  it("takes its cap from maxVisibleActions", () => {
    render(<DataTableToolbar actions={five} maxVisibleActions={1} />)

    expect(
      screen.getByRole("button", { name: "Print pick lists" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Import" })).toBeNull()
  })

  it("leaves an action that asked for the menu there, without spending the budget", () => {
    render(
      <DataTableToolbar
        actions={[
          { label: "Archive", standalone: false, onClick: vi.fn() },
          ...five.slice(0, 2),
        ]}
      />
    )

    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull()
    expect(
      screen.getByRole("button", { name: "Print pick lists" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument()
  })

  it("draws the menu trigger as a 36px outline icon", () => {
    render(<DataTableToolbar actions={five} />)

    expect(
      screen.getByRole("button", { name: "More table actions" })
    ).toMatchObject({
      dataset: expect.objectContaining({ variant: "outline", size: "icon" }),
    })
  })

  it("renders nothing with nothing to show", () => {
    const { container } = render(<DataTableToolbar />)

    expect(container).toBeEmptyDOMElement()
  })
})
