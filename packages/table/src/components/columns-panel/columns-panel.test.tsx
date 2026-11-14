import type { DataTableColumn } from "../data-table/data-table.types"
import type { ColumnPinSide } from "../../lib/table-state"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataTableColumnsPanel } from "./columns-panel"

interface Order {
  sku: string
  customer: string
}

const columns: DataTableColumn<Order>[] = [
  { id: "sku", label: "SKU" },
  { id: "customer_name", label: "Customer" },
  { id: "notes", label: "Notes", isHidden: true },
  // No text of its own — the id is all there is to call it.
  { id: "flag", label: "" },
]

type Props = Partial<React.ComponentProps<typeof DataTableColumnsPanel<Order>>>

function setup(props: Props = {}) {
  const onToggleColumn = vi.fn()
  const utils = render(
    <DataTableColumnsPanel<Order>
      columns={columns}
      onToggleColumn={onToggleColumn}
      {...props}
    />
  )

  return { ...utils, onToggleColumn }
}

/** The row for the column shown as `name`. */
function row(name: string) {
  return screen.getByText(name).closest("li") as HTMLElement
}

/** dnd-kit's live region — the element a screen reader is told about the drag through. */
function liveRegion() {
  return document.querySelector('[id^="DndLiveRegion"]') as HTMLElement
}

describe("DataTableColumnsPanel", () => {
  it("lists every column it is given, by its header text, in order", () => {
    setup()

    const names = screen
      .getAllByRole("listitem")
      .map((item) => item.textContent)

    expect(names[0]).toContain("SKU")
    expect(names[1]).toContain("Customer")
    expect(names[3]).toContain("flag")
  })

  it("names each visibility toggle after its column", () => {
    setup()

    expect(
      within(row("SKU")).getByRole("button", { name: "Hide column SKU" })
    ).toBeVisible()
    expect(
      within(row("Notes")).getByRole("button", { name: "Show column Notes" })
    ).toBeVisible()
    expect(
      within(row("flag")).getByRole("button", { name: "Hide column flag" })
    ).toBeVisible()
  })

  it("reports a toggle by column id", async () => {
    const { onToggleColumn } = setup()

    await userEvent.click(
      screen.getByRole("button", { name: "Hide column Customer" })
    )

    expect(onToggleColumn).toHaveBeenCalledWith("customer_name")
  })

  it("offers no grips and no pins unless asked", () => {
    setup()

    expect(screen.queryByLabelText(/^Reorder/)).toBeNull()
    expect(screen.queryByRole("button", { name: /^Pin/ })).toBeNull()
  })

  describe("pinning", () => {
    it("groups pinned columns into their own sections and skips empty ones", () => {
      const getPinSide = (id: string): ColumnPinSide =>
        id === "sku" ? "left" : false
      setup({ withPinning: true, getPinSide })

      const headings = screen
        .getAllByRole("heading")
        .map((heading) => heading.textContent)

      expect(headings.map((text) => text?.trim())).toEqual([
        "Pinned left",
        "Columns",
      ])
    })

    it("pins to a side, and unpins from the side it is already on", async () => {
      const onPin = vi.fn()
      const getPinSide = (id: string): ColumnPinSide =>
        id === "sku" ? "left" : false
      setup({ withPinning: true, getPinSide, onPin })

      await userEvent.click(
        screen.getByRole("button", { name: "Pin Customer right" })
      )
      expect(onPin).toHaveBeenLastCalledWith("customer_name", "right")

      await userEvent.click(screen.getByRole("button", { name: "Unpin SKU" }))
      expect(onPin).toHaveBeenLastCalledWith("sku", false)
    })

    it("ignores getPinSide while pinning is off", () => {
      setup({ getPinSide: () => "left" })

      expect(screen.queryByText("Pinned left")).toBeNull()
    })
  })

  describe("reordering", () => {
    it("gives each grip the column name, and the keyboard instructions", () => {
      setup({ withReorder: true })

      const grip = screen.getByLabelText("Reorder Customer")
      const instructions = document.getElementById(
        grip.getAttribute("aria-describedby") ?? ""
      )

      expect(instructions).toHaveTextContent(/press Space or Enter/)
    })

    it("announces the drag and its cancel by header text, not by id", async () => {
      setup({ withReorder: true })

      screen.getByLabelText("Reorder Customer").focus()
      await userEvent.keyboard(" ")

      // jsdom lays nothing out, so every rect is zero and dnd-kit reports the drag as over
      // the first row straight away — the pick-up is overwritten by that before the assertion
      // runs. What matters is the vocabulary: header text and position, never the id.
      expect(liveRegion()).toHaveTextContent(
        /^Customer moved to position \d of 4\.$/
      )
      expect(liveRegion()).not.toHaveTextContent("customer_name")

      // dnd-kit starts listening for the keys that end a drag on the next task, not at once,
      // and listens on the document — dispatched there, because under jsdom an Escape keydown
      // on the grip itself stops propagating before it reaches the document.
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" })

      expect(liveRegion()).toHaveTextContent(
        "Moving Customer cancelled. It is back at position 2 of 4."
      )
    })
  })
})
