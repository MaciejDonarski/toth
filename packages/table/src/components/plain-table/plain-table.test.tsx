import type { PlainTableCellProps, PlainTableColumn } from "."
import { PlainTable, PlainTableAlignButton } from "."
import { DEFAULT_STORAGE_KEY } from "."
import { getScope, getSnapshot, subscribe } from "../../lib/table-registry"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Row = { id: string; sku: string; qty: number }

const rows: Row[] = [
  { id: "a", sku: "ABC-1", qty: 4 },
  { id: "b", sku: "ABC-2", qty: 7 },
]

const columns: PlainTableColumn<Row>[] = [
  { id: "sku", label: "SKU", defaultWidth: 200 },
  { id: "qty", label: "Qty", defaultWidth: 100, align: "right" },
]

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

/** Aligns a column the way a user does: its header chevron, then a row of the Align section. */
async function chooseAlign(column: string, align: "Left" | "Center" | "Right") {
  await userEvent.click(
    screen.getByRole("button", { name: `Options for the ${column} column` })
  )
  await userEvent.click(
    await screen.findByRole("menuitemradio", { name: align })
  )
}

describe("PlainTable", () => {
  it("renders a header and one row per record, on its slots", () => {
    const { container } = render(<PlainTable columns={columns} rows={rows} />)

    expect(
      container.querySelector('[data-slot="plain-table"]')
    ).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /SKU/ })).toHaveAttribute(
      "scope",
      "col"
    )
    expect(screen.getAllByRole("row")).toHaveLength(3) // header + two records
    expect(screen.getByText("ABC-2")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
  })

  it("sizes the colgroup from the column definitions", () => {
    const { container } = render(<PlainTable columns={columns} rows={rows} />)

    const widths = Array.from(container.querySelectorAll("col")).map(
      (col) => (col as HTMLTableColElement).style.width
    )

    expect(widths).toEqual(["200px", "100px"])
  })

  it("clamps a column's default width to its own limits", () => {
    const { container } = render(
      <PlainTable
        columns={[
          { id: "sku", label: "SKU", defaultWidth: 900, maxWidth: 300 },
        ]}
        rows={rows}
      />
    )

    expect(container.querySelector("col")).toHaveStyle({ width: "300px" })
  })

  // ===================== states =====================

  it("shows the empty state when there are no rows", () => {
    render(<PlainTable columns={columns} rows={[]} />)

    expect(screen.getByText("No data yet")).toBeInTheDocument()
  })

  it("stands skeletons in for the first page", () => {
    const { container } = render(
      <PlainTable columns={columns} rows={[]} loading placeholderRows={3} />
    )

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6) // 3 × 2
    expect(screen.queryByText("No data yet")).not.toBeInTheDocument()
    // Nothing to overlay while the placeholders ARE the loading state.
    expect(
      container.querySelector('[data-slot="plain-table-loader"]')
    ).toBeNull()
  })

  // The rule from react-ui-patterns: a loading indicator only where there is no data. A refetch
  // over visible rows must not throw them away.
  it("keeps the rows and runs a progress bar while refetching", () => {
    const { container } = render(
      <PlainTable columns={columns} rows={rows} loading />
    )

    expect(screen.getByText("ABC-1")).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
    expect(
      container.querySelector('[data-slot="plain-table-loader"]')
    ).toBeInTheDocument()
    // A bar under the header, not a veil: the rows stay readable while they are refetched.
    expect(
      screen.getByRole("progressbar", { name: "Loading" })
    ).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="plain-table-wrapper"]')
    ).toHaveAttribute("data-loading")
  })

  it("shows the error state instead of the empty one, with a retry", async () => {
    const onRetry = vi.fn()
    render(
      <PlainTable columns={columns} rows={[]} error="Boom" onRetry={onRetry} />
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Boom")
    expect(screen.queryByText("No data yet")).not.toBeInTheDocument()

    const retry = screen.getByRole("button", { name: "Try again" })
    // ui's own outline button, not a restyled bare `<button>`.
    expect(retry).toHaveAttribute("data-variant", "outline")
    expect(screen.getByText("Couldn’t load the data")).toBeInTheDocument()
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "Your filters are kept."
    )

    await userEvent.click(retry)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  // Narrowed to nothing is a different state from having nothing, with a different way out.
  it('tells "no matches" from "no data", and offers to clear the filters', async () => {
    const onClearFilters = vi.fn()
    const { container, rerender } = render(
      <PlainTable
        columns={columns}
        rows={[]}
        slotProps={{ noData: { hasFilters: true, onClearFilters } }}
      />
    )

    expect(
      screen.getByText("No results match these filters")
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(onClearFilters).toHaveBeenCalled()
    expect(
      container.querySelector('[data-slot="plain-table-no-data"]')
    ).toHaveAttribute("data-slot", "plain-table-no-data")

    rerender(
      <PlainTable
        columns={columns}
        rows={[]}
        slotProps={{
          noData: {
            message: "No orders yet",
            description: "They arrive here.",
          },
        }}
      />
    )
    expect(screen.getByText("No orders yet")).toBeInTheDocument()
    expect(screen.getByText("They arrive here.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull()
  })

  it("says the filters survived a failure, where there are any", () => {
    render(
      <PlainTable
        columns={columns}
        rows={[]}
        error="The server did not answer in time (504)."
        slotProps={{ error: { hasFilters: true } }}
      />
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The server did not answer in time (504). Your filters are kept."
    )
    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-tone",
      "destructive"
    )
  })

  it("prefers the error state over the placeholders while loading", () => {
    const { container } = render(
      <PlainTable columns={columns} rows={[]} loading error="Boom" />
    )

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
  })

  // ===================== totals =====================

  it("draws a totals row from the columns that declare a footer", () => {
    const { container } = render(
      <PlainTable
        columns={[
          {
            id: "sku",
            label: "SKU",
            footer: (all) => `Total · ${all.length} lines`,
          },
          { id: "note", label: "Note" },
          {
            id: "qty",
            label: "Qty",
            align: "right",
            footer: (all) => all.reduce((sum, row) => sum + Number(row.qty), 0),
          },
        ]}
        rows={rows}
      />
    )

    const cells = [...container.querySelectorAll("tfoot td")]
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "Total · 2 lines",
      "",
      "11",
    ])
    expect(cells[2]).toHaveAttribute("data-align", "right")
    expect(cells[0]?.closest("tfoot")).toHaveAttribute(
      "data-slot",
      "plain-table-footer"
    )
  })

  it("draws no totals row without a footer, with no rows, or while loading", () => {
    const withFooter = [{ id: "sku", label: "SKU", footer: () => "Total" }]
    const { container, rerender } = render(
      <PlainTable columns={columns} rows={rows} />
    )
    expect(container.querySelector("tfoot")).toBeNull()

    rerender(<PlainTable columns={withFooter} rows={[]} />)
    expect(container.querySelector("tfoot")).toBeNull()

    rerender(<PlainTable columns={withFooter} rows={[]} loading />)
    expect(container.querySelector("tfoot")).toBeNull()
  })

  // ===================== alignment =====================

  it("aligns a column from its menu, which opens on the alignment in effect", async () => {
    render(<PlainTable columns={columns} rows={rows} />)

    const header = screen.getByRole("columnheader", { name: /Qty/ })
    expect(header).toHaveAttribute("data-align", "right")

    // `align: "right"` in the column and no override stored: the menu has to say Right.
    await userEvent.click(
      screen.getByRole("button", { name: "Options for the Qty column" })
    )
    expect(
      await screen.findByRole("menuitemradio", { name: "Right" })
    ).toHaveAttribute("aria-checked", "true")

    await userEvent.click(screen.getByRole("menuitemradio", { name: "Left" }))
    expect(header).toHaveAttribute("data-align", "left")
  })

  it("opens the column menu from the keyboard", async () => {
    render(<PlainTable columns={columns} rows={rows} />)

    screen.getByRole("button", { name: "Options for the SKU column" }).focus()
    await userEvent.keyboard("{Enter}")

    expect(await screen.findByRole("menu")).toBeInTheDocument()
    expect(screen.getByText("Align")).toBeInTheDocument()
  })

  it("carries the alignment down to the body cells", async () => {
    const { container } = render(<PlainTable columns={columns} rows={rows} />)

    await chooseAlign("SKU", "Center")

    const cells = container.querySelectorAll('td[data-id="sku"]')
    expect(cells).toHaveLength(2)
    cells.forEach((cell) =>
      expect(cell).toHaveAttribute("data-align", "center")
    )
  })

  it("lets a caller add to the column menu, or empty it", async () => {
    const onSelect = vi.fn()
    const { unmount } = render(
      <PlainTable
        columns={columns}
        rows={rows}
        slotProps={{
          header: {
            getColumnMenuItems: (column, defaults) => [
              ...defaults,
              {
                key: "mine",
                items: [{ key: "copy", label: `Copy ${column.id}`, onSelect }],
              },
            ],
          },
        }}
      />
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Options for the SKU column" })
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Copy sku" })
    )
    expect(onSelect).toHaveBeenCalled()
    unmount()

    render(
      <PlainTable
        columns={columns}
        rows={rows}
        slotProps={{ header: { getColumnMenuItems: () => [] } }}
      />
    )
    // Nothing to offer is no chevron, not a chevron opening an empty menu.
    expect(
      screen.queryByRole("button", { name: /Options for/ })
    ).not.toBeInTheDocument()
  })

  // Deprecated, but a table that passed the old button as a slot keeps it.
  it("still draws an align button passed explicitly as a slot", () => {
    render(
      <PlainTable
        columns={columns}
        rows={rows}
        slots={{ alignButton: PlainTableAlignButton }}
      />
    )

    expect(screen.getAllByRole("button", { name: /^Align the/ })).toHaveLength(
      2
    )
  })

  it("offers no align control on a column that opted out", () => {
    render(
      <PlainTable
        columns={[{ id: "sku", label: "SKU", isAlignable: false }]}
        rows={rows}
      />
    )

    expect(
      within(screen.getByRole("columnheader")).queryByRole("button")
    ).not.toBeInTheDocument()
  })

  it("hides the header controls while there is nothing to align", () => {
    render(<PlainTable columns={columns} rows={[]} />)

    expect(
      screen.queryByRole("button", { name: /Options for/ })
    ).not.toBeInTheDocument()
  })

  // ===================== resizing =====================

  it("renders a resize handle only where a column asked for one", () => {
    render(
      <PlainTable
        columns={[
          { id: "sku", label: "SKU", isResizable: true },
          { id: "qty", label: "Qty" },
        ]}
        rows={rows}
      />
    )

    expect(screen.getAllByRole("separator")).toHaveLength(1)
    expect(screen.getByRole("separator")).toHaveAccessibleName(
      "Resize the SKU column"
    )
  })

  // The edge itself, drawn by the stylesheet — no button, no grip icon in the cell.
  it("draws the resize handle as the column edge, still a separator", () => {
    render(
      <PlainTable
        columns={[{ id: "sku", label: "SKU", isResizable: true }]}
        rows={rows}
      />
    )

    const handle = screen.getByRole("separator")

    expect(handle.tagName).toBe("DIV")
    expect(handle).toHaveAttribute("data-slot", "plain-table-resize-handle")
    expect(handle).not.toHaveAttribute("data-slot", "button")
    expect(handle).toBeEmptyDOMElement()
    expect(handle).toHaveAttribute("data-slot", "plain-table-resize-handle")
  })

  it("announces the width and its limits on the resize handle", async () => {
    render(
      <PlainTable
        columns={[
          {
            id: "sku",
            label: "SKU",
            defaultWidth: 200,
            minWidth: 120,
            maxWidth: 400,
            isResizable: true,
          },
        ]}
        rows={rows}
      />
    )

    const handle = screen.getByRole("separator")

    expect(handle).toHaveAttribute("aria-orientation", "vertical")
    expect(handle).toHaveAttribute("aria-valuenow", "200")
    expect(handle).toHaveAttribute("aria-valuemin", "120")
    expect(handle).toHaveAttribute("aria-valuemax", "400")

    handle.focus()
    await userEvent.keyboard("{ArrowRight}")

    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-valuenow",
      "216"
    )
  })

  it("resizes from the keyboard, and restores the default width with Home", async () => {
    const { container } = render(
      <PlainTable
        columns={[
          { id: "sku", label: "SKU", defaultWidth: 200, isResizable: true },
        ]}
        rows={rows}
      />
    )

    const handle = screen.getByRole("separator")
    handle.focus()

    await userEvent.keyboard("{ArrowRight}")
    expect(container.querySelector("col")).toHaveStyle({ width: "216px" })

    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}")
    expect(container.querySelector("col")).toHaveStyle({ width: "184px" })

    await userEvent.keyboard("{Home}")
    expect(container.querySelector("col")).toHaveStyle({ width: "200px" })
  })

  it("will not resize past the column limits", async () => {
    const { container } = render(
      <PlainTable
        columns={[
          {
            id: "sku",
            label: "SKU",
            defaultWidth: 200,
            maxWidth: 210,
            isResizable: true,
          },
        ]}
        rows={rows}
      />
    )

    screen.getByRole("separator").focus()
    await userEvent.keyboard("{ArrowRight}{ArrowRight}")

    expect(container.querySelector("col")).toHaveStyle({ width: "210px" })
  })

  it("reports a committed resize", async () => {
    const onResizeEnd = vi.fn()
    render(
      <PlainTable
        columns={[
          { id: "sku", label: "SKU", defaultWidth: 200, isResizable: true },
        ]}
        rows={rows}
        resizableColumnsOptions={{ onResizeEnd }}
      />
    )

    screen.getByRole("separator").focus()
    await userEvent.keyboard("{ArrowRight}")

    expect(onResizeEnd).toHaveBeenCalledWith({
      columnId: "sku",
      width: 216,
      widths: { sku: 216 },
    })
  })

  // ===================== pinned columns =====================

  it("hoists pinned columns to the edges and hands each cell its offset", () => {
    const { container } = render(
      <PlainTable
        columns={[
          { id: "sku", label: "SKU", defaultWidth: 200 },
          { id: "qty", label: "Qty", defaultWidth: 100, stickyLeft: true },
        ]}
        rows={rows}
      />
    )

    const headers = screen.getAllByRole("columnheader")
    // Pinned left, so it moves to the front of the row — `position: sticky` pins a cell where
    // it already sits, and a "sticky left" column in the middle would stick in the middle.
    expect(headers[0]).toHaveAttribute("data-id", "qty")
    expect(headers[0]).toHaveAttribute("data-sticky", "left")
    expect(headers[0]).toHaveAttribute("data-sticky-end", "")
    expect(
      headers[0]!.style.getPropertyValue("--plain-table-sticky-offset")
    ).toBe("0px")
    expect(headers[1]).not.toHaveAttribute("data-sticky")

    // And the body follows, without anything having been written onto a cell after layout.
    expect(container.querySelectorAll('td[data-sticky="left"]')).toHaveLength(2)
  })

  it("stacks two pinned columns by their column widths", () => {
    render(
      <PlainTable
        columns={[
          { id: "sku", label: "SKU", defaultWidth: 120, stickyLeft: true },
          { id: "qty", label: "Qty", defaultWidth: 100, stickyLeft: true },
        ]}
        rows={rows}
      />
    )

    const headers = screen.getAllByRole("columnheader")
    expect(
      headers[0]!.style.getPropertyValue("--plain-table-sticky-offset")
    ).toBe("0px")
    expect(
      headers[1]!.style.getPropertyValue("--plain-table-sticky-offset")
    ).toBe("120px")
    // Only the one facing the scrolling content draws the seam.
    expect(headers[0]).not.toHaveAttribute("data-sticky-end")
    expect(headers[1]).toHaveAttribute("data-sticky-end", "")
  })

  // ===================== slots =====================

  // ===================== truncation =====================

  // jsdom lays nothing out, so the overflow is stated per cell — which is all the handler reads.
  function overflow(
    cell: HTMLElement,
    scrollWidth: number,
    clientWidth: number
  ) {
    Object.defineProperty(cell, "scrollWidth", {
      configurable: true,
      value: scrollWidth,
    })
    Object.defineProperty(cell, "clientWidth", {
      configurable: true,
      value: clientWidth,
    })
  }

  it("gives a truncated text cell its full text as a title, once the pointer arrives", () => {
    render(<PlainTable columns={columns} rows={rows} />)

    const cell = screen.getByText("ABC-1").closest("td") as HTMLElement
    overflow(cell, 300, 100)

    expect(cell).not.toHaveAttribute("title")

    fireEvent.pointerOver(cell)

    expect(cell).toHaveAttribute("title", "ABC-1")
  })

  it("leaves a cell that fits, or one a template drew, without a title", () => {
    const Badge = ({ row }: PlainTableCellProps<Row>) => (
      <strong>{row.sku}</strong>
    )

    render(
      <PlainTable
        columns={[
          { id: "sku", label: "SKU" },
          { id: "badge", label: "Badge", template: Badge },
        ]}
        rows={rows}
      />
    )

    const [plain, drawn] = screen.getAllByText("ABC-1")

    const fits = plain!.closest("td") as HTMLElement
    overflow(fits, 100, 100)
    fireEvent.pointerOver(fits)

    const templated = drawn!.closest("td") as HTMLElement
    overflow(templated, 300, 100)
    fireEvent.pointerOver(templated)

    expect(fits).not.toHaveAttribute("title")
    expect(templated).not.toHaveAttribute("title")
  })

  it("renders a column's own template", () => {
    function Qty({ row }: PlainTableCellProps<Row>) {
      return <b data-testid="qty">{row.qty * 2}</b>
    }

    render(
      <PlainTable
        columns={[{ id: "qty", label: "Qty", template: Qty }]}
        rows={rows}
      />
    )

    expect(
      screen.getAllByTestId("qty").map((node) => node.textContent)
    ).toEqual(["8", "14"])
  })

  it("replaces a built-in part through slots, and passes slotProps to it", () => {
    render(
      <PlainTable
        columns={columns}
        rows={[]}
        slots={{ noData: ({ message }) => <p>{message}</p> }}
        slotProps={{ noData: { message: "Nothing here" } }}
      />
    )

    expect(screen.getByText("Nothing here")).toBeInTheDocument()
  })

  it("stringifies a value React cannot render, rather than dropping it", () => {
    render(
      <PlainTable
        columns={[{ id: "when", label: "When" }]}
        rows={[{ id: "1", when: new Date("2026-08-28T00:00:00Z") }]}
      />
    )

    expect(screen.getByRole("cell")).toHaveTextContent("2026")
  })

  // ===================== persistence =====================

  it("persists aligns and widths per table id, and reads them back on mount", async () => {
    const { unmount } = render(
      <PlainTable
        id="orders"
        persistState
        columns={[
          { id: "sku", label: "SKU", defaultWidth: 200, isResizable: true },
        ]}
        rows={rows}
      />
    )

    await chooseAlign("SKU", "Center")
    screen.getByRole("separator").focus()
    await userEvent.keyboard("{ArrowRight}")

    const stored = JSON.parse(
      window.localStorage.getItem(DEFAULT_STORAGE_KEY) ?? "{}"
    )
    expect(stored.orders).toEqual({
      columnAlign: { sku: "center" },
      columnWidth: { sku: 216 },
    })

    unmount()

    const { container } = render(
      <PlainTable
        id="orders"
        persistState
        columns={[
          { id: "sku", label: "SKU", defaultWidth: 200, isResizable: true },
        ]}
        rows={rows}
      />
    )

    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "data-align",
      "center"
    )
    expect(container.querySelector("col")).toHaveStyle({ width: "216px" })
  })

  it("touches no storage without persistState", async () => {
    render(<PlainTable id="orders" columns={columns} rows={rows} />)

    await chooseAlign("SKU", "Center")

    expect(window.localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull()
  })

  it("keeps one user’s state out of another’s", async () => {
    render(
      <PlainTable
        id="orders"
        userId={7}
        persistState
        columns={columns}
        rows={rows}
      />
    )

    await chooseAlign("SKU", "Center")

    const stored = JSON.parse(
      window.localStorage.getItem(DEFAULT_STORAGE_KEY) ?? "{}"
    )
    expect(stored).toHaveProperty("orders:7")
    expect(stored).not.toHaveProperty("orders")
  })

  // ===================== registry =====================

  it("publishes its align and width scopes under its id", () => {
    render(<PlainTable id="orders" columns={columns} rows={rows} />)

    expect(getSnapshot("orders")).toEqual({
      columnAlign: { sku: "left", qty: "right" },
      columnWidth: { sku: 200, qty: 100 },
    })
  })

  it("drives the table from outside and notifies subscribers", () => {
    const listener = vi.fn()
    render(<PlainTable id="orders" columns={columns} rows={rows} />)

    const unsubscribe = subscribe("orders", listener)

    // The call comes from outside React, which is the whole point of the registry — so the
    // resulting render and its effects have to be flushed by hand.
    act(() => {
      getScope("orders", "columnAlign")?.actions.setAlign!(
        "sku" as never,
        "right" as never
      )
    })

    expect(screen.getByRole("columnheader", { name: /SKU/ })).toHaveAttribute(
      "data-align",
      "right"
    )
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ columnAlign: { sku: "right", qty: "right" } })
    )

    unsubscribe()
  })

  it("unregisters on unmount", () => {
    const { unmount } = render(
      <PlainTable id="orders" columns={columns} rows={rows} />
    )
    expect(getScope("orders", "columnAlign")).toBeDefined()

    unmount()
    expect(getScope("orders", "columnAlign")).toBeUndefined()
  })

  it("registers nothing without an id", () => {
    render(<PlainTable columns={columns} rows={rows} />)

    expect(getSnapshot(undefined as unknown as string)).toBeUndefined()
  })

  // ===================== ref =====================

  it("exposes the table and its scroll container through ref", () => {
    const ref = { current: null } as React.RefObject<{
      tableRef: React.RefObject<HTMLTableElement | null>
      wrapperRef: React.RefObject<HTMLDivElement | null>
    } | null>

    render(<PlainTable ref={ref} columns={columns} rows={rows} />)

    expect(ref.current?.tableRef.current?.tagName).toBe("TABLE")
    expect(ref.current?.wrapperRef.current).toHaveAttribute(
      "data-slot",
      "plain-table-wrapper"
    )
  })
})
