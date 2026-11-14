import { tableApi } from "../../lib/table-api"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DataTable } from "./data-table"
import type { DataTableColumn, DataTableProps } from "./data-table.types"

/** The footer's sentence — "1–25 of 60 entries · 2 selected" — split across `<b>`s, so read whole. */
function footerSummary() {
  return document.querySelector('[data-slot="table-footer-summary"]')
}

interface Order {
  id: number
  sku: string
  qty: number
  state: string
}

const columns: DataTableColumn<Order>[] = [
  { id: "sku", label: "SKU", isSortable: true },
  { id: "qty", label: "Qty", isSortable: true },
  { id: "state", label: "State" },
]

const rows: Order[] = [
  { id: 1, sku: "widget", qty: 3, state: "active" },
  { id: 2, sku: "gadget", qty: 10, state: "archived" },
  { id: 3, sku: "doohickey", qty: 1, state: "active" },
]

function setup(props: Partial<DataTableProps<Order>> = {}) {
  return render(<DataTable<Order> columns={columns} rows={rows} {...props} />)
}

// `useIsMobile` reads `window.matchMedia` on every render, and the setup file's stub already covers
// the desktop case by reporting "does not match". Swapped by hand and put back rather than through
// `vi.restoreAllMocks`, which would strip that stub's implementation for every test after this one.
const desktopMatchMedia = window.matchMedia

function forceMobile() {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  window.matchMedia = desktopMatchMedia
})

/** The data cells of the body, row by row, ignoring the table's own control columns. */
function bodyRows() {
  const body = document.querySelector("tbody")

  return [...(body?.querySelectorAll("tr") ?? [])].map((row) =>
    [...row.querySelectorAll("td")]
      .filter((cell) => !cell.dataset.id?.startsWith("__"))
      .map((cell) => cell.textContent)
  )
}

const skus = () => bodyRows().map((cells) => cells[0])

beforeEach(() => {
  localStorage.clear()
})

describe("DataTable", () => {
  it("renders the rows it is given", () => {
    setup()

    expect(skus()).toEqual(["widget", "gadget", "doohickey"])
  })

  it("renders a header per column", () => {
    setup()

    expect(
      screen.getByRole("columnheader", { name: /SKU/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: /Qty/ })
    ).toBeInTheDocument()
  })

  describe("sorting", () => {
    it("sorts a column on click, and cycles back off", async () => {
      setup()

      const sort = screen.getByRole("button", { name: /^SKU/ })

      await userEvent.click(sort)
      expect(skus()).toEqual(["doohickey", "gadget", "widget"])

      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))
      expect(skus()).toEqual(["widget", "gadget", "doohickey"])

      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))
      expect(skus()).toEqual(["widget", "gadget", "doohickey"])
    })

    it("announces the direction on the column header, where a screen reader looks for it", async () => {
      setup()

      expect(screen.getByRole("columnheader", { name: /SKU/ })).toHaveAttribute(
        "aria-sort",
        "none"
      )

      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))

      expect(screen.getByRole("columnheader", { name: /SKU/ })).toHaveAttribute(
        "aria-sort",
        "ascending"
      )
    })

    it("gives an unsortable column no sort control and no aria-sort", () => {
      setup()

      expect(screen.queryByRole("button", { name: /^State/ })).toBeNull()
      expect(
        screen.getByRole("columnheader", { name: /State/ })
      ).not.toHaveAttribute("aria-sort")
    })
  })

  describe("the column menu", () => {
    async function openMenu(column: string) {
      // The previous menu has to be gone first: while one is open the page under it is
      // inert, and a click aimed at another header would land on nothing.
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
      await userEvent.click(
        screen.getByRole("button", { name: `Options for the ${column} column` })
      )
      return screen.findByRole("menu")
    }

    it("sorts from the menu, and takes the sort off when chosen again", async () => {
      setup()

      await openMenu("Qty")
      await userEvent.click(
        screen.getByRole("menuitemcheckbox", { name: "Sort descending" })
      )
      expect(skus()).toEqual(["gadget", "widget", "doohickey"])
      expect(screen.getByRole("columnheader", { name: /Qty/ })).toHaveAttribute(
        "aria-sort",
        "descending"
      )

      await openMenu("Qty")
      expect(
        screen.getByRole("menuitemcheckbox", { name: "Sort descending" })
      ).toHaveAttribute("aria-checked", "true")
      await userEvent.click(
        screen.getByRole("menuitemcheckbox", { name: "Sort descending" })
      )
      expect(skus()).toEqual(["widget", "gadget", "doohickey"])
    })

    it("offers no Sort rows on a column that cannot be sorted", async () => {
      setup()

      await openMenu("State")
      expect(
        screen.queryByRole("menuitemcheckbox", { name: /^Sort/ })
      ).toBeNull()
      expect(
        screen.getByRole("menuitemradio", { name: "Left" })
      ).toBeInTheDocument()
    })

    it("hides a column from the menu and reports it", async () => {
      const onColumnVisibilityChange = vi.fn()
      setup({ onColumnVisibilityChange })

      await openMenu("State")
      await userEvent.click(
        screen.getByRole("menuitem", { name: "Hide column" })
      )

      expect(onColumnVisibilityChange).toHaveBeenLastCalledWith({
        hiddenIds: ["state"],
      })
      expect(screen.queryByRole("columnheader", { name: /State/ })).toBeNull()
    })

    it("pins and unpins only where pinning is on", async () => {
      const onColumnPinningChange = vi.fn()
      const { unmount } = setup()
      await openMenu("SKU")
      expect(
        screen.queryByRole("menuitem", { name: "Pin to left edge" })
      ).toBeNull()
      unmount()

      setup({ withColumnPinning: true, onColumnPinningChange })
      await openMenu("Qty")
      await userEvent.click(
        screen.getByRole("menuitem", { name: "Pin to left edge" })
      )
      expect(onColumnPinningChange).toHaveBeenLastCalledWith({
        left: ["qty"],
        right: [],
      })

      await openMenu("Qty")
      expect(
        screen.getByRole("menuitem", { name: "Unpin" })
      ).toBeInTheDocument()
    })

    it("gives the selection column no menu", () => {
      setup({ withSelection: true })

      expect(
        screen.getAllByRole("button", { name: /^Options for the/ })
      ).toHaveLength(3)
    })

    it("is not drawn on a phone-sized window, where the label still sorts", async () => {
      forceMobile()
      setup()

      expect(
        screen.queryByRole("button", { name: /^Options for the/ })
      ).toBeNull()
      await userEvent.click(screen.getByRole("button", { name: /^Qty,/ }))
      expect(skus()).toEqual(["doohickey", "widget", "gadget"])
    })
  })

  describe("selection", () => {
    it("adds no checkbox column unless asked", () => {
      setup()

      expect(screen.queryByRole("checkbox")).toBeNull()
    })

    it("selects a row and reports it", async () => {
      const onSelectedIdsChange = vi.fn()
      setup({ withSelection: true, onSelectedIdsChange })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 2" })
      )

      expect(onSelectedIdsChange).toHaveBeenCalledWith([2])
    })

    it("selects the whole page from the header menu", async () => {
      // Client-side, the header control can mean four different things (select this page,
      // clear it, select everything, clear everything), so it opens a menu rather than
      // toggling on its own click — `isPageSelected` alone would be ambiguous with
      // `isAllSelected` sharing the same box.
      const onSelectedIdsChange = vi.fn()
      setup({ withSelection: true, onSelectedIdsChange })

      await userEvent.click(
        screen.getByRole("button", { name: "Selection options" })
      )
      await userEvent.click(
        await screen.findByRole("menuitem", { name: "Select current page" })
      )

      expect(onSelectedIdsChange).toHaveBeenCalledWith([1, 2, 3])
    })

    it("toggles the page directly from the header box in manual mode", async () => {
      // In manual mode there is no "select all" to disambiguate against, so the box goes
      // back to being a real, one-click checkbox.
      const onSelectedIdsChange = vi.fn()
      setup({
        manual: true,
        totalItems: 3,
        withSelection: true,
        onSelectedIdsChange,
      })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select all rows on this page" })
      )

      expect(onSelectedIdsChange).toHaveBeenCalledWith([1, 2, 3])
      expect(
        screen.getByRole("checkbox", { name: "Clear all rows on this page" })
      ).toBeChecked()
    })

    it("shows the header box as mixed while only some rows on the page are ticked", async () => {
      setup({ manual: true, totalItems: 3, withSelection: true })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 2" })
      )

      const header = screen.getByRole("checkbox", {
        name: "Select all rows on this page",
      })
      expect(header).toHaveAttribute("aria-checked", "mixed")
    })

    it("names each row checkbox with getRowLabel when given", () => {
      setup({ withSelection: true, getRowLabel: (row) => row.sku })

      expect(
        screen.getByRole("checkbox", { name: "Select gadget" })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole("checkbox", { name: "Select row 2" })
      ).toBeNull()
    })

    it("marks rows aria-selected only when selection is on", async () => {
      const { unmount } = setup()

      expect(document.querySelector("tbody tr")).not.toHaveAttribute(
        "aria-selected"
      )
      unmount()

      setup({ withSelection: true })
      const checkbox = screen.getByRole("checkbox", { name: "Select row 1" })
      const row = checkbox.closest("tr")

      expect(row).toHaveAttribute("aria-selected", "false")

      await userEvent.click(checkbox)

      expect(row).toHaveAttribute("aria-selected", "true")
    })

    // The memoised row only helps if nothing inside it is re-rendered from above anyway — the
    // row checkboxes and the row menus read context, and a context value that changes re-renders
    // every consumer. Each counter below is called once per render of one row's part.
    it("re-renders only the row whose checkbox was ticked", async () => {
      const many = Array.from({ length: 50 }, (_, index) => ({
        id: index + 1,
        sku: `sku-${index + 1}`,
        qty: index,
        state: "active",
      }))
      const renders = {
        cell: new Set<number>(),
        box: new Set<number>(),
        menu: new Set<number>(),
      }
      let cellCount = 0

      function CountingCell({ row }: { row: Order }) {
        cellCount += 1
        renders.cell.add(row.id)
        return <>{row.sku}</>
      }

      const counted: DataTableColumn<Order>[] = [
        { id: "sku", label: "SKU", template: CountingCell as never },
        { id: "qty", label: "Qty" },
      ]

      const getRowLabel = (row: Order) => {
        renders.box.add(row.id)
        return row.sku
      }

      const rowActions = [
        {
          label: (row: Order) => {
            renders.menu.add(row.id)
            return "Archive"
          },
        },
      ]

      render(
        <DataTable<Order>
          columns={counted}
          rows={many}
          withSelection
          withPagination={false}
          getRowLabel={getRowLabel}
          rowActions={rowActions}
        />
      )

      renders.cell.clear()
      renders.box.clear()
      renders.menu.clear()
      cellCount = 0

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select sku-7" })
      )

      expect([...renders.cell]).toEqual([7])
      expect(cellCount).toBe(1)
      expect([...renders.box]).toEqual([7])
      expect([...renders.menu]).toEqual([7])
    })

    it("counts the selection in the footer", async () => {
      setup({ withSelection: true })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )

      expect(footerSummary()).toHaveTextContent("1 selected")
    })

    it("marks a selected row so it can be highlighted", async () => {
      setup({ withSelection: true })

      const checkbox = screen.getByRole("checkbox", { name: "Select row 1" })
      const row = checkbox.closest("tr")

      expect(row).not.toHaveClass("data-table-row-selected")

      await userEvent.click(checkbox)

      expect(row).toHaveClass("data-table-row-selected")
    })
  })

  // The scenario from the design review, step by step: 67 orders, 25 to a page.
  describe("the selection menu", () => {
    const many: Order[] = Array.from({ length: 67 }, (_, index) => ({
      id: index + 1,
      sku: `sku-${index + 1}`,
      qty: index,
      state: "active",
    }))

    async function choose(name: string) {
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
      await userEvent.click(
        screen.getByRole("button", { name: "Selection options" })
      )
      await userEvent.click(await screen.findByRole("menuitem", { name }))
    }

    async function menuState() {
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
      await userEvent.click(
        screen.getByRole("button", { name: "Selection options" })
      )
      const menu = await screen.findByRole("menu")
      const disabled = (name: string) =>
        within(menu)
          .getByRole("menuitem", { name })
          .getAttribute("aria-disabled") === "true"
      const state = {
        heading: menu.querySelector('[data-slot="dropdown-menu-label"]')
          ?.textContent,
        selectPage: disabled("Select current page"),
        selectAll: disabled("Select all 67"),
        deselectPage: disabled("Deselect current page"),
        deselectAll: disabled("Deselect all"),
      }
      await userEvent.keyboard("{Escape}")
      return state
    }

    const pageBox = () =>
      screen.getByRole("checkbox", { name: /all rows on this page$/ })

    it("walks clear → page → all → page off → nothing, with the box and menu agreeing", async () => {
      render(<DataTable<Order> columns={columns} rows={many} withSelection />)

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 2" })
      )
      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 3" })
      )
      expect(pageBox()).toHaveAttribute("aria-checked", "mixed")
      expect(await menuState()).toMatchObject({ heading: "2 of 67 selected" })

      await choose("Select current page")
      expect(pageBox()).toHaveAttribute("aria-checked", "true")
      expect(footerSummary()).toHaveTextContent("25 selected")

      await choose("Select all 67")
      expect(footerSummary()).toHaveTextContent("67 selected")
      expect(await menuState()).toEqual({
        heading: "67 of 67 selected",
        selectPage: true,
        selectAll: true,
        deselectPage: false,
        deselectAll: false,
      })

      await choose("Deselect current page")
      // Nothing on this page, 42 elsewhere: still mixed — the box is the only hint.
      expect(pageBox()).toHaveAttribute("aria-checked", "mixed")
      expect(footerSummary()).toHaveTextContent("42 selected")

      await choose("Deselect all")
      expect(pageBox()).toHaveAttribute("aria-checked", "false")
      expect(await menuState()).toEqual({
        heading: "Nothing selected",
        selectPage: false,
        selectAll: false,
        deselectPage: true,
        deselectAll: true,
      })
    })

    it('leaves "Select all" out against a server that cannot take it', async () => {
      render(
        <DataTable<Order>
          columns={columns}
          rows={many.slice(0, 25)}
          manual
          totalItems={67}
          withSelection
        />
      )

      await userEvent.click(
        screen.getByRole("button", { name: "Selection options" })
      )
      await screen.findByRole("menu")
      expect(screen.queryByRole("menuitem", { name: /Select all/ })).toBeNull()
      expect(
        screen.getByRole("menuitem", { name: "Select current page" })
      ).toBeInTheDocument()
    })
  })

  describe("the search box", () => {
    it('shows the placeholder the search options give, and "Search" without one', () => {
      const { unmount } = setup({ withSearch: true })
      expect(screen.getByRole("searchbox")).toHaveAttribute(
        "placeholder",
        "Search"
      )
      unmount()

      setup({
        withSearch: true,
        searchOptions: { placeholder: "Search orders..." },
      })
      expect(screen.getByRole("searchbox")).toHaveAttribute(
        "placeholder",
        "Search orders..."
      )
    })
  })

  describe("the bulk bar", () => {
    it("replaces the toolbar while rows are selected, and only with bulk actions", async () => {
      const { unmount } = setup({ withSelection: true, withSearch: true })
      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )
      expect(screen.queryByRole("region", { name: "Selection" })).toBeNull()
      expect(screen.getByRole("searchbox")).toBeInTheDocument()
      unmount()

      const onClick = vi.fn()
      setup({
        withSelection: true,
        withSearch: true,
        bulkActions: [{ label: "Print labels", icon: "download", onClick }],
      })
      expect(screen.queryByRole("region", { name: "Selection" })).toBeNull()

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )
      const bar = screen.getByRole("region", { name: "Selection" })
      expect(bar).toHaveTextContent("1 selected")
      expect(screen.queryByRole("searchbox")).toBeNull()

      await userEvent.click(
        within(bar).getByRole("button", { name: "Print labels" })
      )
      expect(onClick).toHaveBeenCalled()
    })

    it("hands a function what is selected", async () => {
      const bulkActions = vi.fn(({ count }: { count: number }) => [
        { label: `Cancel ${count}`, onClick: vi.fn() },
      ])
      setup({ withSelection: true, bulkActions })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )
      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 2" })
      )

      expect(
        screen.getByRole("button", { name: "Cancel 2" })
      ).toBeInTheDocument()
      expect(bulkActions).toHaveBeenLastCalledWith(
        expect.objectContaining({ selectedIds: [1, 2], mode: "ids", count: 2 })
      )
    })

    it("widens to everything matching, and clears", async () => {
      setup({
        withSelection: true,
        bulkActions: [{ label: "Export", onClick: vi.fn() }],
      })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )
      await userEvent.click(
        screen.getByRole("button", { name: "Select all 3 matching" })
      )
      expect(
        screen.getByRole("region", { name: "Selection" })
      ).toHaveTextContent("3 selected")
      expect(screen.queryByRole("button", { name: /matching/ })).toBeNull()

      await userEvent.click(
        screen.getByRole("button", { name: "Clear selection" })
      )
      expect(screen.queryByRole("region", { name: "Selection" })).toBeNull()
    })

    it("asks before a destructive action runs", async () => {
      const onClick = vi.fn()
      setup({
        withSelection: true,
        bulkActions: [
          {
            label: "Cancel orders",
            variant: "destructive",
            onClick,
            confirm: {
              title: "Cancel selected orders?",
              description: "Their stock is released.",
              confirmLabel: "Cancel orders",
              cancelLabel: "Keep orders",
            },
          },
        ],
      })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )
      await userEvent.click(
        screen.getByRole("button", { name: "Cancel orders" })
      )

      const dialog = await screen.findByRole("dialog", {
        name: "Cancel selected orders?",
      })
      expect(onClick).not.toHaveBeenCalled()

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Cancel orders" })
      )
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe("pagination", () => {
    const many = Array.from({ length: 60 }, (_, index) => ({
      id: index + 1,
      sku: `sku-${index + 1}`,
      qty: index,
      state: "active",
    }))

    it("cuts the rows to a page and says so", () => {
      setup({ rows: many, paginationOptions: { pageSize: 25 } })

      expect(bodyRows()).toHaveLength(25)
      expect(footerSummary()).toHaveTextContent("1–25 of 60 entries")
    })

    it("moves to another page", async () => {
      setup({ rows: many, paginationOptions: { pageSize: 25 } })

      await userEvent.click(
        screen.getByRole("button", { name: "Go to page 3" })
      )

      expect(skus()[0]).toBe("sku-51")
      expect(footerSummary()).toHaveTextContent("51–60 of 60 entries")
    })

    it("draws no pager when everything fits on one page", () => {
      setup()

      expect(
        screen.queryByRole("navigation", { name: "pagination" })
      ).toBeNull()
    })

    it("leaves the rows alone in manual mode and takes the total from the server", () => {
      setup({
        manual: true,
        totalItems: 500,
        paginationOptions: { pageSize: 3 },
      })

      expect(bodyRows()).toHaveLength(3)
      expect(footerSummary()).toHaveTextContent("1–3 of 500 entries")
    })
  })

  describe("filtering", () => {
    it("adds no Filters control unless filters are declared", () => {
      setup()

      expect(screen.queryByRole("button", { name: /Filters/ })).toBeNull()
    })

    it("narrows the rows client-side", async () => {
      setup({
        filters: [
          { field: "state", type: "select", options: [], label: "State" },
        ],
        // Applied outright rather than through the panel: the panel's own behaviour is
        // covered where it lives, and this is about the table acting on the result.
        id: "filtering-table",
      })

      expect(skus()).toHaveLength(3)

      tableApi.setFiltering("filtering-table", {
        state: { operator: "eq", value: "active" },
      })

      expect(await screen.findByText("widget")).toBeInTheDocument()
      expect(skus()).toEqual(["widget", "doohickey"])
    })

    it("leaves the rows to the server in manual mode", () => {
      setup({
        manual: true,
        id: "manual-filtering",
        filters: [
          { field: "state", type: "select", options: [], label: "State" },
        ],
      })

      tableApi.setFiltering("manual-filtering", {
        state: { operator: "eq", value: "nothing-matches-this" },
      })

      expect(skus()).toHaveLength(3)
    })

    it("shows a chip for what is in force, and clears it", async () => {
      setup({
        id: "chips-table",
        filters: [{ field: "sku", label: "SKU" }],
      })

      tableApi.setFiltering("chips-table", { sku: "widget" })

      const chip = await screen.findByText("widget")
      expect(chip).toBeInTheDocument()

      await userEvent.click(
        screen.getByRole("button", { name: "Remove filter SKU" })
      )

      expect(skus()).toHaveLength(3)
    })
  })

  describe("the quick view", () => {
    const rowPreview = {
      title: (row: Order) => row.sku,
      subtitle: (row: Order) => `${row.qty} pcs`,
      render: (row: Order) => <p>State: {row.state}</p>,
    }

    const eyes = () => screen.getAllByRole("button", { name: "Quick view" })

    it("adds an eye to each row, and opens the row over the table from it", async () => {
      const { container } = setup({ rowPreview })

      await userEvent.click(eyes()[1]!)

      const sheet = await screen.findByRole("dialog", { name: "gadget" })
      expect(sheet).toHaveAttribute("data-placement", "contained")
      expect(within(sheet).getByText("10 pcs")).toBeInTheDocument()
      expect(within(sheet).getByText("State: archived")).toBeInTheDocument()
      expect(eyes()[1]).toHaveAttribute("aria-expanded", "true")
      expect(eyes()[1]).toHaveAttribute("aria-controls", sheet.id)
      expect(eyes()[0]).toHaveAttribute("aria-expanded", "false")
      expect(container.querySelectorAll("tbody tr")[1]).toHaveClass(
        "data-table-row-previewing"
      )
    })

    it("is never opened by clicking the row", async () => {
      setup({ rowPreview })

      await userEvent.click(screen.getByText("gadget"))

      expect(screen.queryByRole("dialog")).toBeNull()
    })

    it("steps through the page, and stops at its ends", async () => {
      setup({ rowPreview })

      await userEvent.click(eyes()[0]!)
      const sheet = await screen.findByRole("dialog", { name: "widget" })
      expect(
        within(sheet).getByRole("button", { name: "Previous row" })
      ).toBeDisabled()

      await userEvent.click(
        within(sheet).getByRole("button", { name: "Next row" })
      )
      await userEvent.click(
        within(sheet).getByRole("button", { name: "Next row" })
      )
      expect(
        screen.getByRole("dialog", { name: "doohickey" })
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Next row" })).toBeDisabled()
    })

    it("closes on Escape and gives focus back to that row’s eye", async () => {
      setup({ rowPreview })

      await userEvent.click(eyes()[2]!)
      await screen.findByRole("dialog")
      await userEvent.keyboard("{Escape}")

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(eyes()[2]).toHaveFocus()
    })

    it("takes turns with the filters: opening one closes the other", async () => {
      setup({ rowPreview, filters: [{ field: "sku", label: "SKU" }] })

      await userEvent.click(eyes()[0]!)
      await screen.findByRole("dialog", { name: "widget" })

      await userEvent.click(screen.getByRole("button", { name: /^Filters/ }))
      await screen.findByRole("dialog", { name: "Filters" })
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "widget" })).toBeNull()
      )

      await userEvent.click(eyes()[1]!)
      await screen.findByRole("dialog", { name: "gadget" })
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull()
      )
    })

    it("closes on a press on the rows, and switches rows from another eye", async () => {
      setup({ rowPreview })

      await userEvent.click(eyes()[0]!)
      await screen.findByRole("dialog", { name: "widget" })

      // Another row's eye moves the panel rather than closing it under the press.
      await userEvent.click(eyes()[1]!)
      expect(
        await screen.findByRole("dialog", { name: "gadget" })
      ).toBeInTheDocument()
      expect(eyes()[1]).toHaveAttribute("aria-expanded", "true")

      // Its own eye toggles it closed, and nothing opens it again.
      await userEvent.click(eyes()[1]!)
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

      await userEvent.click(eyes()[2]!)
      await screen.findByRole("dialog", { name: "doohickey" })
      await userEvent.click(screen.getByText("widget"))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })

    it("can be driven from outside", async () => {
      const onActiveRowChange = vi.fn()
      const { rerender } = setup({
        rowPreview,
        activeRowId: 3,
        onActiveRowChange,
      })

      expect(
        await screen.findByRole("dialog", { name: "doohickey" })
      ).toBeInTheDocument()

      await userEvent.click(eyes()[0]!)
      expect(onActiveRowChange).toHaveBeenLastCalledWith(1)
      // Controlled: nothing moves until the parent says so.
      expect(
        screen.getByRole("dialog", { name: "doohickey" })
      ).toBeInTheDocument()

      rerender(
        <DataTable<Order>
          columns={columns}
          rows={rows}
          rowPreview={rowPreview}
          activeRowId={null}
        />
      )
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })

    it('puts "Quick view" in the row menu beside the eye, sized for two controls', async () => {
      const { container } = setup({
        rowPreview,
        rowActions: [{ label: "Archive", onClick: vi.fn() }],
      })

      const col = container.querySelectorAll("col")
      expect(col[col.length - 1]).toHaveStyle({ width: "80px" })

      await userEvent.click(
        screen.getAllByRole("button", { name: "Row actions" })[0]!
      )
      expect(
        await screen.findByRole("menuitem", { name: "Quick view" })
      ).toBeInTheDocument()
    })
  })

  describe("the table size", () => {
    // jsdom lays nothing out: every element is given the same width, which is all the table
    // measures — its own root and its wrapper.
    let measured: { mockRestore: () => void } | null = null

    function atWidth(width: number) {
      measured = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(
          () =>
            ({
              width,
              height: 400,
              top: 0,
              left: 0,
              right: width,
              bottom: 400,
            }) as DOMRect
        )
    }

    // This spy only — `vi.restoreAllMocks` would also strip the setup file's `matchMedia` stub.
    afterEach(() => {
      measured?.mockRestore()
      measured = null
    })

    const tableActions = [
      { label: "Print pick lists", onClick: vi.fn() },
      { label: "Export", onClick: vi.fn() },
      { label: "Import", onClick: vi.fn() },
    ]
    const viewExtras = [
      {
        label: "Refresh",
        icon: "refresh-cw" as const,
        standalone: true,
        onClick: vi.fn(),
      },
    ]

    async function menuItems() {
      await userEvent.click(
        screen.getByRole("button", { name: "More table actions" })
      )
      const items = (await screen.findAllByRole("menuitem")).map(
        (item) => item.textContent
      )
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
      return items
    }

    function visibleTableActions() {
      const group = screen.getByRole("group", { name: "Table actions" })
      return within(group)
        .queryAllByRole("button")
        .map((button) => button.textContent)
        .filter((text) => text !== "")
    }

    it.each([
      [360, "sm"],
      [734, "md"],
      [990, "lg"],
    ])(
      "measures a %ipx table as %s, on the root and the wrapper",
      (width, size) => {
        atWidth(width)
        const { container } = setup()

        expect(
          container.querySelector('[data-slot="data-table"]')
        ).toHaveAttribute("data-size", size)
        expect(
          container.querySelector('[data-slot="plain-table-wrapper"]')
        ).toHaveAttribute("data-size", size)
      }
    )

    it("keeps two table actions as buttons at lg, the rest in the menu", async () => {
      atWidth(990)
      setup({ headerActions: tableActions, rightActions: viewExtras })

      expect(visibleTableActions()).toEqual(["Print pick lists", "Export"])
      expect(
        screen.getByRole("button", { name: "Refresh" })
      ).toBeInTheDocument()
      expect(await menuItems()).toEqual(["Import"])
    })

    it("moves the second one to the menu at md", async () => {
      atWidth(734)
      setup({ headerActions: tableActions, rightActions: viewExtras })

      expect(visibleTableActions()).toEqual(["Print pick lists"])
      expect(await menuItems()).toEqual(["Export", "Import"])
    })

    it("keeps only Filters and View options at sm, with Refresh first in the menu", async () => {
      atWidth(360)
      setup({
        headerActions: tableActions,
        rightActions: viewExtras,
        filters: [{ field: "sku", label: "SKU" }],
      })

      expect(visibleTableActions()).toEqual([])
      expect(
        screen.getByRole("button", { name: /^Filters/ })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "View options" })
      ).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull()
      expect(await menuItems()).toEqual([
        "Refresh",
        "Print pick lists",
        "Export",
        "Import",
      ])
    })

    it("lays the narrow chrome out for sm: chips in one line, the current page only", () => {
      atWidth(360)
      const { container } = setup({
        rows: Array.from({ length: 60 }, (_, index) => ({
          id: index + 1,
          sku: `sku-${index + 1}`,
          qty: index,
          state: "active",
        })),
        filters: [{ field: "sku", label: "SKU" }],
        filtering: { sku: "sku" },
        onFilteringChange: vi.fn(),
      })

      expect(
        container.querySelector('[data-slot="active-filters"]')
      ).toHaveAttribute("data-size", "sm")
      expect(container.querySelector('[data-slot="toolbar"]')).toHaveAttribute(
        "data-size",
        "sm"
      )
      expect(
        screen.getByRole("button", { name: "Go to page 1" })
      ).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Go to page 2" })).toBeNull()
      expect(
        screen.getByRole("button", { name: "Go to next page" })
      ).toBeEnabled()
    })
  })

  describe("on a phone", () => {
    it("docks the bulk bar at the foot of the screen and keeps the toolbar", async () => {
      forceMobile()
      setup({
        withSelection: true,
        withSearch: true,
        bulkActions: [
          { label: "Print labels", icon: "download", onClick: vi.fn() },
          {
            label: "Cancel orders",
            icon: "trash",
            variant: "destructive",
            onClick: vi.fn(),
          },
        ],
      })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )

      const bar = screen.getByRole("region", { name: "Selection" })
      expect(bar).toHaveAttribute("data-docked")
      expect(screen.getByRole("searchbox")).toBeInTheDocument()
      expect(
        within(bar).getByRole("button", { name: "Print labels" })
      ).toHaveAttribute("data-size", "icon")
      expect(
        within(bar).queryByRole("button", { name: "Cancel orders" })
      ).toBeNull()

      await userEvent.click(
        within(bar).getByRole("button", { name: "More selection actions" })
      )
      const items = (await screen.findAllByRole("menuitem")).map(
        (item) => item.textContent
      )
      expect(items).toEqual([
        "Select current page",
        "Select all 3",
        "Deselect current page",
        "Deselect all",
        "Cancel orders",
      ])
    })

    it("opens View options as a full-screen sheet", async () => {
      forceMobile()
      setup()

      await userEvent.click(
        screen.getByRole("button", { name: "View options" })
      )
      const sheet = await screen.findByRole("dialog")

      expect(sheet).toHaveAttribute("data-side", "bottom")
    })
  })

  describe("the filter sheet", () => {
    const filters = [{ field: "sku", label: "SKU" }]

    async function openFilters() {
      await userEvent.click(screen.getByRole("button", { name: /^Filters/ }))
      return screen.findByRole("dialog", { name: "Filters" })
    }

    it("opens over the rows, inside the table, without a backdrop", async () => {
      const { container } = setup({ filters })

      const trigger = screen.getByRole("button", { name: /^Filters/ })
      expect(trigger).toHaveAttribute("aria-expanded", "false")

      const sheet = await openFilters()
      expect(sheet).toHaveAttribute("data-placement", "contained")
      expect(
        container.querySelector('[data-slot="data-table-body"]')
      ).toContainElement(sheet)
      expect(
        container.querySelector('[data-slot="data-table-body"]')
      ).toHaveAttribute("data-sheet", "filters")
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      expect(trigger).toHaveAttribute("aria-controls", sheet.id)
      expect(document.querySelector(".sn-sheet-overlay")).toBeNull()
      expect(within(sheet).getByText("Applied as you edit")).toBeInTheDocument()
    })

    it("closes on Escape and gives focus back to the Filters button", async () => {
      setup({ filters })

      await openFilters()
      await userEvent.keyboard("{Escape}")

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(screen.getByRole("button", { name: /^Filters/ })).toHaveFocus()
    })

    it("closes from Done", async () => {
      setup({ filters })

      const sheet = await openFilters()
      await userEvent.click(within(sheet).getByRole("button", { name: "Done" }))

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })

    it("follows a filter removed outside it, rather than putting it back", async () => {
      setup({ id: "sheet-sync", filters })
      act(() => tableApi.setFiltering("sheet-sync", { sku: "widget" }))

      const sheet = await openFilters()
      expect(within(sheet).getByRole("textbox", { name: "SKU" })).toHaveValue(
        "widget"
      )
      expect(
        within(sheet).getByText("1 active · Applied as you edit")
      ).toBeInTheDocument()

      // From outside the tree: a press on the chip would close the panel now.
      act(() => tableApi.setFiltering("sheet-sync", {}))

      expect(within(sheet).getByRole("textbox", { name: "SKU" })).toHaveValue(
        ""
      )
    })

    describe("a press outside it", () => {
      it("closes it from the rows, and leaves focus where the press put it", async () => {
        // Base UI only returns focus after an outside press where `focus({ preventScroll })`
        // is supported, which it detects by the option being read — jsdom never reads it.
        const focus = HTMLElement.prototype.focus
        const spy = vi
          .spyOn(HTMLElement.prototype, "focus")
          .mockImplementation(function (
            this: HTMLElement,
            options?: FocusOptions
          ) {
            void options?.preventScroll
            focus.call(this, options)
          })
        setup({ filters, withSearch: true })

        await openFilters()
        await userEvent.click(screen.getByText("gadget"))

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(
          screen.getByRole("button", { name: /^Filters/ })
        ).toHaveAttribute("aria-expanded", "false")

        await openFilters()
        await userEvent.click(screen.getByRole("searchbox"))

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(screen.getByRole("searchbox")).toHaveFocus()

        // The next close is its own: Done still hands focus back.
        const sheet = await openFilters()
        await userEvent.click(
          within(sheet).getByRole("button", { name: "Done" })
        )
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        await waitFor(() =>
          expect(screen.getByRole("button", { name: /^Filters/ })).toHaveFocus()
        )
        spy.mockRestore()
      })

      it("closes it from the page around the table", async () => {
        render(
          <>
            <button type="button">Elsewhere</button>
            <DataTable<Order> columns={columns} rows={rows} filters={filters} />
          </>
        )

        await openFilters()
        await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }))

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      })

      it("toggles it closed from the Filters button, without opening it again", async () => {
        setup({ filters })

        await openFilters()
        await userEvent.click(screen.getByRole("button", { name: /^Filters/ }))

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(
          screen.getByRole("button", { name: /^Filters/ })
        ).toHaveAttribute("aria-expanded", "false")
      })

      it("does not count a dropdown list portalled out of a filter field", async () => {
        setup({
          filters: [
            {
              field: "state",
              type: "select",
              label: "State",
              options: [
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
              ],
            },
          ],
        })

        const sheet = await openFilters()
        await userEvent.click(
          within(sheet).getByRole("combobox", { name: "State" })
        )
        const option = await screen.findByRole("option", { name: "Archived" })
        // Portalled out of the panel, which is the case under test.
        expect(sheet).not.toContainElement(option)
        await userEvent.click(option)

        expect(
          screen.getByRole("dialog", { name: "Filters" })
        ).toBeInTheDocument()
        await waitFor(() => expect(skus()).toEqual(["gadget"]))
      })

      it("does not count the date-range calendar portalled out of a filter field", async () => {
        setup({
          filters: [
            {
              field: "created",
              type: "date",
              label: "Created",
              fieldProps: { dateFormat: "MM/dd/yyyy" },
            },
          ],
        })

        const sheet = await openFilters()
        await userEvent.click(
          within(sheet).getByRole("button", { name: /^Created/ })
        )
        await waitFor(() =>
          expect(screen.getAllByRole("dialog")).toHaveLength(2)
        )
        const calendar = screen
          .getAllByRole("dialog")
          .find((dialog) => dialog !== sheet)!
        expect(sheet).not.toContainElement(calendar)
        await userEvent.click(
          calendar.querySelector("[data-day] button") as HTMLElement
        )

        expect(
          screen.getByRole("dialog", { name: "Filters" })
        ).toBeInTheDocument()
      })

      it("discards an unapplied draft, as Escape does, when filters wait for Apply", async () => {
        setup({ filters, filtersOptions: { submitOnChange: false } })

        let sheet = await openFilters()
        await userEvent.type(
          within(sheet).getByRole("textbox", { name: "SKU" }),
          "gad"
        )
        await userEvent.click(screen.getByText("widget"))
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

        expect(skus()).toEqual(["widget", "gadget", "doohickey"])
        sheet = await openFilters()
        expect(within(sheet).getByRole("textbox", { name: "SKU" })).toHaveValue(
          ""
        )
      })

      it("leaves a phone’s full-screen panel alone", async () => {
        forceMobile()
        render(
          <>
            <button type="button">Elsewhere</button>
            <DataTable<Order> columns={columns} rows={rows} filters={filters} />
          </>
        )

        await openFilters()
        // Hidden from the accessibility tree while the modal panel is up.
        await userEvent.click(
          screen.getByRole("button", { name: "Elsewhere", hidden: true }),
          { pointerEventsCheck: 0 }
        )

        expect(
          screen.getByRole("dialog", { name: "Filters" })
        ).toBeInTheDocument()
      })
    })

    it('ends in "Show N entries" on a phone', async () => {
      forceMobile()
      setup({ filters, itemsLabel: "orders" })

      const sheet = await openFilters()

      expect(
        within(sheet).getByRole("button", { name: "Show 3 orders" })
      ).toBeInTheDocument()
      expect(within(sheet).queryByRole("button", { name: "Done" })).toBeNull()
      expect(sheet).not.toHaveAttribute("data-placement")
      expect(sheet).toHaveAttribute("data-side", "bottom")
    })

    it("still opens as a popover when asked", async () => {
      setup({ filters, filtersOptions: { container: "popover" } })

      await userEvent.click(screen.getByRole("button", { name: /^Filters/ }))
      const dialog = await screen.findByRole("dialog")
      expect(dialog).not.toHaveAttribute("data-placement")
      expect(dialog).toHaveAttribute("data-slot", "popover-content")
    })
  })

  describe("row actions", () => {
    it("adds no actions column unless actions are declared", () => {
      setup()

      expect(screen.queryByRole("button", { name: "Row actions" })).toBeNull()
    })

    it("runs an action with the row it belongs to", async () => {
      const onClick = vi.fn()
      setup({ rowActions: [{ label: "Archive", onClick }] })

      const triggers = screen.getAllByRole("button", { name: "Row actions" })
      expect(triggers).toHaveLength(3)

      await userEvent.click(triggers[1]!)
      await userEvent.click(
        await screen.findByRole("menuitem", { name: "Archive" })
      )

      expect(onClick).toHaveBeenCalledWith(rows[1])
    })

    it("resolves a per-row label", async () => {
      setup({
        rowActions: [
          { label: (row: Order) => `Archive ${row.sku}`, onClick: vi.fn() },
        ],
      })

      await userEvent.click(
        screen.getAllByRole("button", { name: "Row actions" })[0]!
      )

      expect(
        await screen.findByRole("menuitem", { name: "Archive widget" })
      ).toBeInTheDocument()
    })
  })

  // The actions column is pinned to the trailing edge, so it is always the last `<col>`. jsdom has
  // no `ResizeObserver`, so the wrapper never measures and `useResizableColumns` hands out the
  // natural widths unstretched — which is exactly what these assert.
  describe("the actions column width", () => {
    function actionsColWidth(container: HTMLElement) {
      const cols = Array.from(container.querySelectorAll("col"))

      return (cols[cols.length - 1] as HTMLTableColElement).style.width
    }

    const edit = { label: "Edit", icon: "pencil" } as const

    it("holds one trigger when everything stays in the menu", () => {
      const { container } = setup({
        rowActions: [{ label: "Archive", onClick: vi.fn() }],
      })

      expect(actionsColWidth(container)).toBe("44px")
    })

    it("widens for a promoted action", () => {
      const { container } = setup({
        rowActions: [
          { ...edit, standalone: true, onClick: vi.fn() },
          { label: "Archive" },
        ],
      })

      expect(actionsColWidth(container)).toBe("80px")
      expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3)
      expect(
        screen.getAllByRole("button", { name: "Row actions" })
      ).toHaveLength(3)
    })

    it("leaves no room for a trigger that is never drawn", () => {
      const { container } = setup({
        rowActions: [
          { ...edit, standalone: true },
          { label: "Delete", icon: "trash", standalone: true },
          { label: "Copy", icon: "file-down", standalone: true },
        ],
      })

      expect(actionsColWidth(container)).toBe("116px")
      expect(screen.queryByRole("button", { name: "Row actions" })).toBeNull()
    })

    it("gives the width back below the breakpoint for a 'desktop' action", async () => {
      const rowActions = [
        { ...edit, standalone: "desktop" as const },
        { label: "Archive" },
      ]

      const wide = setup({ rowActions })
      expect(actionsColWidth(wide.container)).toBe("80px")
      wide.unmount()

      forceMobile()
      const narrow = setup({ rowActions })

      expect(actionsColWidth(narrow.container)).toBe("44px")
      expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()

      await userEvent.click(
        screen.getAllByRole("button", { name: "Row actions" })[0]!
      )
      expect(
        await screen.findByRole("menuitem", { name: "Edit" })
      ).toBeInTheDocument()
    })

    it("keeps an action with no icon in the menu, and the column narrow", async () => {
      const { container } = setup({
        rowActions: [{ label: "Edit", standalone: true }, { label: "Archive" }],
      })

      expect(actionsColWidth(container)).toBe("44px")

      await userEvent.click(
        screen.getAllByRole("button", { name: "Row actions" })[0]!
      )
      expect(
        await screen.findByRole("menuitem", { name: "Edit" })
      ).toBeInTheDocument()
    })

    it("drops the column entirely when every action is hidden", () => {
      const { container } = setup({
        rowActions: [{ label: "Archive", hidden: true }],
      })

      expect(container.querySelector('[data-id="__actions"]')).toBeNull()
      expect(container.querySelectorAll("col")).toHaveLength(columns.length)
    })

    it("lets the caller override the computed width", () => {
      const { container } = setup({
        rowActions: [{ ...edit, standalone: true }],
        rowActionsColumnWidth: 120,
      })

      expect(actionsColWidth(container)).toBe("120px")
    })

    it("draws icon and label when an action asks for a bigger size", () => {
      // A non-icon `size` needs no `icon` to be promotable — the label is what fills the
      // button. The width is unknowable from the label alone, so this needs the override too.
      setup({
        rowActions: [
          { label: "Edit", size: "sm", standalone: true, onClick: vi.fn() },
        ],
        rowActionsColumnWidth: 120,
      })

      const button = screen.getAllByRole("button", { name: "Edit" })[0]
      expect(button).toHaveTextContent("Edit")
      expect(button).toHaveAttribute("data-size", "sm")
    })

    it("keeps the column identity across a rerender with a fresh actions array", () => {
      const { container, rerender } = render(
        <DataTable<Order>
          columns={columns}
          rows={rows}
          rowActions={[{ label: "A" }]}
        />
      )

      const before = actionsColWidth(container)

      rerender(
        <DataTable<Order>
          columns={columns}
          rows={rows}
          rowActions={[{ label: "A" }]}
        />
      )

      expect(actionsColWidth(container)).toBe(before)
    })
  })

  describe("the toolbar", () => {
    it("offers View options by default, as a 36px ghost icon with a tooltip", async () => {
      setup()

      const button = screen.getByRole("button", { name: "View options" })
      expect(button).toMatchObject({
        dataset: expect.objectContaining({ variant: "ghost", size: "icon" }),
      })
      expect(button).not.toHaveAttribute("title")

      await userEvent.hover(button)
      const tooltip = await waitFor(() => {
        const surface = document.querySelector('[data-slot="tooltip-content"]')
        expect(surface).toBeInTheDocument()
        return surface
      })
      expect(tooltip).toHaveTextContent("View options")
    })

    it("explains the More actions trigger with a tooltip", async () => {
      setup({
        headerActions: [
          { label: "Export", onClick: vi.fn() },
          { label: "Import", onClick: vi.fn() },
          { label: "Print", onClick: vi.fn() },
        ],
      })

      const trigger = screen.getByRole("button", { name: "More table actions" })
      expect(trigger).not.toHaveAttribute("title")

      await userEvent.hover(trigger)
      await waitFor(() =>
        expect(
          document.querySelector('[data-slot="tooltip-content"]')
        ).toHaveTextContent("More actions")
      )
    })

    async function openViewOptions() {
      await userEvent.click(
        screen.getByRole("button", { name: "View options" })
      )
      return screen.findByRole("dialog")
    }

    it("hides a column from View options", async () => {
      setup()

      const panel = await openViewOptions()
      const row = within(panel).getByText("Qty").closest("li") as HTMLElement
      expect(within(panel).getByText(/3 of 3 shown/)).toBeInTheDocument()
      await userEvent.click(within(row).getByRole("checkbox"))

      expect(screen.queryByRole("columnheader", { name: /Qty/ })).toBeNull()
      expect(within(panel).getByText(/2 of 3 shown/)).toBeInTheDocument()
    })

    it("switches density and dividers, and remembers them with persistState", async () => {
      const onDensityChange = vi.fn()
      const { container, unmount } = setup({
        id: "view",
        persistState: true,
        onDensityChange,
      })

      const panel = await openViewOptions()
      await userEvent.click(
        within(panel).getByRole("button", { name: "Compact" })
      )
      await userEvent.click(within(panel).getByRole("switch"))

      const root = container.querySelector('[data-slot="data-table"]')
      expect(root).toHaveAttribute("data-density", "compact")
      expect(root).toHaveAttribute("data-column-dividers")
      expect(onDensityChange).toHaveBeenCalledWith("compact")
      unmount()

      const again = setup({ id: "view", persistState: true })
      const restored = again.container.querySelector('[data-slot="data-table"]')
      expect(restored).toHaveAttribute("data-density", "compact")
      expect(restored).toHaveAttribute("data-column-dividers")
    })

    it("takes column dividers from props until the user chooses", () => {
      const { container } = setup({ columnDividers: true })

      expect(
        container.querySelector('[data-slot="data-table"]')
      ).toHaveAttribute("data-column-dividers")
    })

    it("moves a column with the arrows, and resets the whole view", async () => {
      const onColumnOrderChange = vi.fn()
      setup({ withColumnReorder: true, onColumnOrderChange })

      const panel = await openViewOptions()
      await userEvent.click(
        within(panel).getByRole("button", { name: "Move Qty up" })
      )
      expect(onColumnOrderChange).toHaveBeenLastCalledWith({
        order: ["qty", "sku", "state"],
      })
      expect(
        within(panel).getByRole("button", { name: "Move Qty up" })
      ).toBeDisabled()

      await userEvent.click(
        within(panel).getByRole("button", { name: "Compact" })
      )
      await userEvent.click(
        within(panel).getByRole("button", { name: "Reset to default view" })
      )
      expect(onColumnOrderChange).toHaveBeenLastCalledWith({
        order: ["sku", "qty", "state"],
      })
      expect(
        document.querySelector('[data-slot="data-table"]')
      ).toHaveAttribute("data-density", "default")
    })

    it("counts the filters in force on the Filters button", () => {
      const filters = [
        { field: "sku", label: "SKU" },
        { field: "state", label: "State" },
      ]
      const { unmount } = setup({ filters })
      expect(
        screen.getByRole("button", { name: "Filters" })
      ).toBeInTheDocument()
      unmount()

      setup({
        filters,
        filtering: {
          sku: "widget",
          fulltext_search: {
            fieldType: "text",
            filterType: "like",
            value: "x",
          },
        },
      })
      // The search term is not a filter: one active, not two.
      expect(
        screen.getByRole("button", { name: /^Filters/ })
      ).toHaveTextContent("Filters1")
    })

    it("draws the caller's own actions", () => {
      setup({
        headerActions: [
          { label: "Add order", standalone: true, onClick: vi.fn() },
        ],
      })

      expect(
        screen.getByRole("button", { name: "Add order" })
      ).toBeInTheDocument()
    })
  })

  describe("state", () => {
    it("reports the whole view whenever part of it changes", async () => {
      const onStateChange = vi.fn()
      setup({ onStateChange })

      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { columnId: "", direction: "" },
          visibleColumns: ["sku", "qty", "state"],
        })
      )

      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))

      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: { columnId: "sku", direction: "asc" } })
      )
    })

    it("publishes itself to the registry under its id", async () => {
      setup({ id: "orders" })

      await userEvent.click(screen.getByRole("button", { name: /^Qty/ }))

      expect(tableApi.getSort("orders")).toEqual({
        columnId: "qty",
        direction: "asc",
      })
    })

    it("takes orders through the imperative api", async () => {
      setup({ id: "orders-api" })

      tableApi.setSort("orders-api", { columnId: "qty", direction: "desc" })

      expect(await screen.findByText("gadget")).toBeInTheDocument()
      expect(skus()).toEqual(["gadget", "widget", "doohickey"])
    })
  })

  // Each controlled prop, three ways: the value drives what is on screen, an interaction reports
  // the next value, and the screen follows only once the caller passes that value back.
  describe("controlled state", () => {
    const many = Array.from({ length: 60 }, (_, index) => ({
      id: index + 1,
      sku: `sku-${index + 1}`,
      qty: index,
      state: "active",
    }))

    it("sort", async () => {
      const onSortChange = vi.fn()
      const { rerender } = setup({
        sort: { columnId: "qty", direction: "desc" },
        onSortChange,
      })

      expect(skus()).toEqual(["gadget", "widget", "doohickey"])

      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))

      expect(onSortChange).toHaveBeenCalledWith({
        columnId: "sku",
        direction: "asc",
      })
      expect(skus()).toEqual(["gadget", "widget", "doohickey"])

      rerender(
        <DataTable<Order>
          columns={columns}
          rows={rows}
          sort={{ columnId: "sku", direction: "asc" }}
          onSortChange={onSortChange}
        />
      )

      expect(skus()).toEqual(["doohickey", "gadget", "widget"])
    })

    it("page", async () => {
      const onPageChange = vi.fn()
      const props = {
        rows: many,
        paginationOptions: { pageSize: 25 },
        onPageChange,
      }
      const { rerender } = setup({ ...props, page: 2 })

      expect(skus()[0]).toBe("sku-26")

      await userEvent.click(
        screen.getByRole("button", { name: "Go to page 3" })
      )

      expect(onPageChange).toHaveBeenCalledWith(3)
      expect(skus()[0]).toBe("sku-26")

      rerender(<DataTable<Order> columns={columns} {...props} page={3} />)

      expect(skus()[0]).toBe("sku-51")
    })

    it("page: reports the jump back to page 1 when a filter changes", () => {
      const onPageChange = vi.fn()
      setup({
        id: "controlled-page-filter",
        rows: many,
        page: 2,
        paginationOptions: { pageSize: 25 },
        filters: [{ field: "state", label: "State" }],
        onPageChange,
      })

      act(() =>
        tableApi.setFiltering("controlled-page-filter", { state: "active" })
      )

      expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it("pageSize", async () => {
      const onPageSizeChange = vi.fn()
      const props = { rows: many, onPageSizeChange, id: "controlled-size" }
      const { rerender } = setup({ ...props, pageSize: 10 })

      expect(bodyRows()).toHaveLength(10)

      act(() => tableApi.setPageSize("controlled-size", 50))

      expect(onPageSizeChange).toHaveBeenCalledWith(50)
      expect(bodyRows()).toHaveLength(10)

      rerender(<DataTable<Order> columns={columns} {...props} pageSize={50} />)

      expect(bodyRows()).toHaveLength(50)
    })

    it("selectedIds", async () => {
      const onSelectedIdsChange = vi.fn()
      const props = { rows, withSelection: true, onSelectedIdsChange }
      const { rerender } = setup({ ...props, selectedIds: [2] })

      expect(
        screen.getByRole("checkbox", { name: "Select row 2" })
      ).toBeChecked()

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )

      expect(onSelectedIdsChange).toHaveBeenCalledWith([2, 1])
      expect(
        screen.getByRole("checkbox", { name: "Select row 1" })
      ).not.toBeChecked()

      rerender(
        <DataTable<Order> columns={columns} {...props} selectedIds={[2, 1]} />
      )

      expect(
        screen.getByRole("checkbox", { name: "Select row 1" })
      ).toBeChecked()
      expect(footerSummary()).toHaveTextContent("2 selected")
    })

    it("filtering", async () => {
      const onFilteringChange = vi.fn()
      const props = {
        rows,
        filters: [{ field: "sku", label: "SKU" }],
        onFilteringChange,
      }
      const { rerender } = setup({ ...props, filtering: { sku: "widget" } })

      expect(skus()).toEqual(["widget"])

      await userEvent.click(
        screen.getByRole("button", { name: "Remove filter SKU" })
      )

      expect(onFilteringChange).toHaveBeenCalledWith({})
      expect(skus()).toEqual(["widget"])

      rerender(<DataTable<Order> columns={columns} {...props} filtering={{}} />)

      expect(skus()).toEqual(["widget", "gadget", "doohickey"])
    })

    it("leaves storage alone while controlled", async () => {
      const controlled = setup({
        id: "controlled-storage",
        persistState: true,
        sort: { columnId: "", direction: "" },
      })

      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))

      expect(localStorage.getItem("toth-data-table") ?? "").not.toContain(
        '"sort"'
      )
      controlled.unmount()

      // The same click, uncontrolled, is what does write it.
      setup({ id: "controlled-storage", persistState: true })
      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))

      expect(localStorage.getItem("toth-data-table") ?? "").toContain('"sort"')
    })
  })

  // Only the contract the stylesheet reads. jsdom lays nothing out, so every
  // `getBoundingClientRect()` is zeroes and an assertion about a computed height would be
  // theatre — the cap itself is checked in the browser, against the `FitHeight` story.
  describe("fitting the viewport", () => {
    const root = () =>
      document.querySelector('[data-slot="data-table"]') as HTMLElement

    it("hands the stylesheet the flag and the measured offset", () => {
      setup({ withAdjustHeight: true })

      expect(root()).toHaveAttribute("data-fit-height")
      expect(root().style.getPropertyValue("--data-table-offset-top")).toBe(
        "0px"
      )
    })

    it("stays out of the way by default", () => {
      setup()

      expect(root()).not.toHaveAttribute("data-fit-height")
      expect(root().style.getPropertyValue("--data-table-offset-top")).toBe("")
    })
  })

  describe("density", () => {
    const root = () =>
      document.querySelector('[data-slot="data-table"]') as HTMLElement

    it("is comfortable by default", () => {
      setup()

      expect(root()).toHaveAttribute("data-density", "default")
    })

    it("marks the root compact for density='compact'", () => {
      setup({ density: "compact" })

      expect(root()).toHaveAttribute("data-density", "compact")
    })

    it("reads an explicit density='default' as comfortable too", () => {
      setup({ density: "default" })

      expect(root()).toHaveAttribute("data-density", "default")
    })
  })

  describe("empty and failed", () => {
    it("says the filters matched nothing, and clears them", async () => {
      setup({
        id: "nothing-matches",
        filters: [{ field: "sku", label: "SKU" }],
      })
      act(() => tableApi.setFiltering("nothing-matches", { sku: "zzz" }))

      expect(
        await screen.findByText("No results match these filters")
      ).toBeInTheDocument()
      await userEvent.click(
        screen.getByRole("button", { name: "Clear filters" })
      )
      expect(skus()).toHaveLength(3)
    })
    it("says there is nothing rather than showing an empty grid", () => {
      setup({ rows: [] })

      const body = document.querySelector("tbody")
      expect(
        within(body as HTMLElement).getByText("No data yet")
      ).toBeInTheDocument()
    })

    it("shows the error state", () => {
      setup({ rows: [], error: "Boom" })

      expect(screen.getByText("Boom")).toBeInTheDocument()
    })
  })
})
