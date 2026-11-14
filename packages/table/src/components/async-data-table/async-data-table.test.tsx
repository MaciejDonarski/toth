import { DataTableConfigProvider } from "../data-table/config-context"
import type { DataTableColumn } from "../data-table/data-table.types"
import type { DataTableConfig } from "../../lib/data-table-config-context"
import { tableApi } from "../../lib/table-api"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AsyncDataTable } from "./async-data-table"
import type {
  AsyncDataTableProps,
  DataTablePlugin,
} from "./async-data-table.types"

/** The footer's sentence — "1–25 of 60 entries · 2 selected" — split across `<b>`s, so read whole. */
function footerSummary() {
  return document.querySelector('[data-slot="table-footer-summary"]')
}

interface Order {
  id: number
  sku: string
  customer: string
  notes: string
}

const columns: DataTableColumn<Order>[] = [
  { id: "sku", label: "SKU", field: "sku", isSortable: true },
  { id: "customer", label: "Customer", field: "customer_name" },
  { id: "notes", label: "Notes", field: "notes", isHidden: true },
]

const rows: Order[] = [
  { id: 1, sku: "widget", customer: "Ada", notes: "" },
  { id: 2, sku: "gadget", customer: "Grace", notes: "" },
]

function setup(props: Partial<AsyncDataTableProps<Order>> = {}) {
  const getData = vi.fn()

  const utils = render(
    <AsyncDataTable<Order>
      columns={columns}
      rows={rows}
      totalItems={100}
      getData={getData}
      {...props}
    />
  )

  return { ...utils, getData }
}

/** View options' show/hide box for the column named `name`, once the panel is open. */
async function columnToggle(name: string) {
  const panel = await screen.findByRole("dialog")
  const row = within(panel).getByText(name).closest("li") as HTMLElement

  return within(row).getByRole("checkbox")
}

beforeEach(() => {
  localStorage.clear()
})

describe("AsyncDataTable", () => {
  it("fetches once on mount, for the state it opened in", () => {
    const { getData } = setup()

    expect(getData).toHaveBeenCalledTimes(1)
    expect(getData).toHaveBeenCalledWith(
      {
        fields: ["sku", "customer_name"],
        pagination: { currentPage: 1, pageSize: 25 },
        sorting: undefined,
        filtering: {},
      },
      { signal: expect.any(AbortSignal) }
    )
  })

  it("asks for the server fields, not the column ids", () => {
    const { getData } = setup()

    expect(getData.mock.calls[0]![0].fields).toEqual(["sku", "customer_name"])
  })

  it("leaves a hidden column out of the request", () => {
    const { getData } = setup()

    expect(getData.mock.calls[0]![0].fields).not.toContain("notes")
  })

  it("renders the rows it is given without paging them itself", () => {
    setup({ paginationOptions: { pageSize: 1 } })

    // Two rows for a page size of one: the server said this is the page.
    expect(document.querySelectorAll("tbody tr")).toHaveLength(2)
  })

  it("takes the total from the server", () => {
    setup()

    expect(footerSummary()).toHaveTextContent("1–25 of 100 entries")
  })

  describe("what causes a refetch", () => {
    it("sorting does", async () => {
      const { getData } = setup()

      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))

      expect(getData).toHaveBeenCalledTimes(2)
      expect(getData.mock.calls[1]![0].sorting).toEqual({
        columnId: "sku",
        dir: "asc",
        field: "sku",
      })
    })

    it("paging does", async () => {
      const { getData } = setup({ paginationOptions: { pageSize: 25 } })

      await userEvent.click(
        screen.getByRole("button", { name: "Go to page 2" })
      )

      expect(getData).toHaveBeenCalledTimes(2)
      expect(getData.mock.calls[1]![0].pagination.currentPage).toBe(2)
    })

    it("filtering does, and lands the page reset in the SAME request", async () => {
      // The whole reason the page reset reaches backwards through a ref: a filter change
      // must be one request for page 1, not one for page 3 followed by one for page 1.
      const { getData } = setup({
        id: "async-filtering",
        filters: [{ field: "sku", label: "SKU" }],
        paginationOptions: { pageSize: 25 },
      })

      await userEvent.click(
        screen.getByRole("button", { name: "Go to page 3" })
      )
      expect(getData).toHaveBeenCalledTimes(2)

      tableApi.setFiltering("async-filtering", { sku: "widget" })

      // Waited for rather than asserted outright: the rows are the server's here, so nothing
      // visible changes when a filter is set, and there is no DOM to wait on instead.
      await waitFor(() => expect(getData).toHaveBeenCalledTimes(3))

      expect(getData.mock.calls[2]![0]).toMatchObject({
        filtering: { sku: "widget" },
        pagination: { currentPage: 1 },
      })
    })

    it("selecting a row does NOT", async () => {
      const { getData } = setup({ withSelection: true })

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Select row 1" })
      )

      expect(getData).toHaveBeenCalledTimes(1)
    })

    it("hiding a column does NOT", async () => {
      const { getData } = setup()

      await userEvent.click(
        screen.getByRole("button", { name: "View options" })
      )
      await userEvent.click(await columnToggle("Customer"))

      expect(getData).toHaveBeenCalledTimes(1)
    })

    it("showing a column whose field was never fetched DOES", async () => {
      const { getData } = setup()

      await userEvent.click(
        screen.getByRole("button", { name: "View options" })
      )
      await userEvent.click(await columnToggle("Notes"))

      expect(getData).toHaveBeenCalledTimes(2)
      expect(getData.mock.calls[1]![0].fields).toContain("notes")
    })

    it("showing a column back whose field is already in hand does NOT", async () => {
      const { getData } = setup()

      await userEvent.click(
        screen.getByRole("button", { name: "View options" })
      )
      const box = await columnToggle("Customer")

      await userEvent.click(box)
      await userEvent.click(box)

      expect(getData).toHaveBeenCalledTimes(1)
    })
  })

  describe("refreshToken", () => {
    it("is ignored on the first render — the opening load already covers it", () => {
      const { getData } = setup({ refreshToken: "first" })

      expect(getData).toHaveBeenCalledTimes(1)
    })

    it("refetches the current state when it changes", () => {
      const { getData, rerender } = setup({ refreshToken: "a" })

      rerender(
        <AsyncDataTable<Order>
          columns={columns}
          rows={rows}
          totalItems={100}
          getData={getData}
          refreshToken="b"
        />
      )

      expect(getData).toHaveBeenCalledTimes(2)
    })
  })

  describe("refresh", () => {
    // Refresh is icon-only, so `Actions` draws its `title` as a tooltip rather than a native one.
    const refreshTooltip = () =>
      document.querySelector('[data-slot="tooltip-content"]')

    it("draws Refresh as one icon with no interval menu, even with intervals to offer", () => {
      setup({ refreshOptions: { intervals: [15000, 60000] } })

      const refresh = screen.getByRole("button", { name: "Refresh" })
      expect(refresh).toHaveAttribute("data-size", "icon")
      expect(refresh).toHaveTextContent("")
      expect(refresh).not.toHaveAttribute("aria-haspopup")
      expect(
        screen.queryByRole("button", { name: /Refresh options|More/ })
      ).toBeNull()
    })

    it("turns while fetching, and dots itself while auto-refreshing", async () => {
      const { rerender } = setup({
        loading: true,
        refreshOptions: { enabled: true, interval: 15000 },
      })

      const refresh = screen.getByRole("button", { name: "Refresh" })
      expect(refresh).toHaveAttribute("aria-busy", "true")
      expect(refresh).toHaveAttribute("data-auto")
      await userEvent.hover(refresh)
      await waitFor(() =>
        expect(refreshTooltip()).toHaveTextContent("Refreshing…")
      )

      rerender(
        <AsyncDataTable<Order>
          columns={columns}
          rows={rows}
          totalItems={100}
          getData={vi.fn()}
          refreshOptions={{ enabled: true, interval: 15000 }}
        />
      )
      expect(
        screen.getByRole("button", { name: "Refresh" })
      ).not.toHaveAttribute("aria-busy")
      await waitFor(() =>
        expect(refreshTooltip()).toHaveTextContent(
          /^Refresh · updated .+ · auto every 15 s$/
        )
      )
    })

    it("sets the interval from View options, and dots the button", async () => {
      setup({ refreshOptions: { intervals: [15000, 60000] } })

      await userEvent.click(
        screen.getByRole("button", { name: "View options" })
      )
      const panel = await screen.findByRole("dialog")
      const group = within(panel).getByRole("group", { name: "Auto-refresh" })
      expect(
        within(group).getByRole("button", { name: "Off" })
      ).toHaveAttribute("aria-pressed", "true")

      await userEvent.click(within(group).getByRole("button", { name: "15 s" }))
      expect(screen.getByRole("button", { name: "Refresh" })).toHaveAttribute(
        "data-auto"
      )
    })

    it("offers no Auto-refresh section without intervals", async () => {
      setup()

      await userEvent.click(
        screen.getByRole("button", { name: "View options" })
      )
      const panel = await screen.findByRole("dialog")
      expect(
        within(panel).queryByRole("group", { name: "Auto-refresh" })
      ).toBeNull()
    })

    it("offers a Refresh control that refetches", async () => {
      const { getData } = setup()

      await userEvent.click(screen.getByRole("button", { name: "Refresh" }))

      expect(getData).toHaveBeenCalledTimes(2)
    })

    it("is reachable imperatively, so a plugin can refresh after a mutation", () => {
      const { getData } = setup({ id: "refreshable" })

      tableApi.refresh("refreshable")

      expect(getData).toHaveBeenCalledTimes(2)
    })
  })

  describe("export", () => {
    it("offers nothing unless asked and given a way to do it", () => {
      setup({ withExport: true })

      expect(screen.queryByRole("button", { name: /Export/ })).toBeNull()
    })

    it("asks for the whole result set with no page attached", async () => {
      const onExport = vi.fn().mockResolvedValue(undefined)
      setup({ withExport: true, exportOptions: { onExport } })

      await userEvent.click(screen.getByRole("button", { name: /Export/ }))
      await userEvent.click(
        await screen.findByRole("menuitem", { name: "Everything" })
      )

      expect(onExport).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "all", pagination: undefined })
      )
      // Every column, including the hidden one.
      expect(onExport.mock.calls[0]![0].fields).toEqual([
        "sku",
        "customer_name",
        "notes",
      ])
    })

    it("asks for this page with the page attached, and only the visible columns", async () => {
      const onExport = vi.fn().mockResolvedValue(undefined)
      setup({ withExport: true, exportOptions: { onExport } })

      await userEvent.click(screen.getByRole("button", { name: /Export/ }))
      await userEvent.click(
        await screen.findByRole("menuitem", { name: "This page" })
      )

      expect(onExport).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: "current-page",
          fields: ["sku", "customer_name"],
          pagination: { currentPage: 1, pageSize: 25 },
        })
      )
    })

    it("reports a failure and leaves the table usable", async () => {
      const error = new Error("nope")
      const onError = vi.fn()
      setup({
        withExport: true,
        exportOptions: { onExport: vi.fn().mockRejectedValue(error), onError },
      })

      await userEvent.click(screen.getByRole("button", { name: /Export/ }))
      await userEvent.click(
        await screen.findByRole("menuitem", { name: "Everything" })
      )

      expect(onError).toHaveBeenCalledWith(error)
      // Not left behind a spinner.
      expect(
        document.querySelector('[data-slot="plain-table-loader"]')
      ).toBeNull()
    })
  })

  describe("searchable fields", () => {
    it("asks the server which fields the term is matched against", async () => {
      const getSearchableFields = vi
        .fn()
        .mockResolvedValue([{ field: "sku", label: "SKU" }])

      setup({
        withSearch: true,
        searchOptions: { domain: "orders" },
        getSearchableFields,
      })

      expect(getSearchableFields).toHaveBeenCalledWith("orders")

      // The list is tooltip content, so it exists only once the tooltip is opened — asking
      // for the text directly would be asking for markup that is not there yet.
      await userEvent.hover(await screen.findByLabelText("What is searched"))

      expect(await screen.findByText(/Searches: SKU/)).toBeInTheDocument()
    })

    it("does not ask when the table has no search box", () => {
      const getSearchableFields = vi.fn().mockResolvedValue([])
      setup({ getSearchableFields })

      expect(getSearchableFields).not.toHaveBeenCalled()
    })
  })

  describe("plugins", () => {
    it("composes them around the table, outermost first", async () => {
      const order: string[] = []

      const trace = (name: string): DataTablePlugin<Order> => ({
        name,
        enhance: (Wrapped) =>
          function Traced(props) {
            order.push(name)
            return <Wrapped {...props} />
          },
      })

      const plugins = [trace("outer"), trace("inner")]
      setup({ plugins })

      expect(order).toEqual(["outer", "inner"])
    })

    it("lets a plugin wrap getData", () => {
      const seen = vi.fn()

      const plugins: DataTablePlugin<Order>[] = [
        {
          name: "spy",
          enhance: (Wrapped) =>
            function Spy(props) {
              return (
                <Wrapped
                  {...props}
                  getData={(request, context) => {
                    seen(request)
                    return props.getData(request, context)
                  }}
                />
              )
            },
        },
      ]

      const { getData } = setup({ plugins })

      expect(seen).toHaveBeenCalledTimes(1)
      expect(getData).toHaveBeenCalledTimes(1)
    })

    it("hands a plugin its own props", () => {
      const seen = vi.fn()

      const plugins: DataTablePlugin<Order, { domain: string }>[] = [
        {
          name: "configured",
          props: { domain: "orders" },
          enhance: (Wrapped, pluginProps) => {
            seen(pluginProps)
            return Wrapped
          },
        },
      ]

      setup({ plugins: plugins as DataTablePlugin<Order>[] })

      expect(seen).toHaveBeenCalledWith({ domain: "orders" })
    })
  })

  // The table owns no rows, so "ignoring a stale result" is two halves: the table aborts the
  // superseded request and will not let it stamp the footer, and a caller that checks the signal
  // before writing rows — the pattern the types document — never shows the stale answer.
  describe("superseded requests", () => {
    function deferred() {
      let resolve!: (value: Order[]) => void
      const promise = new Promise<Order[]>((settle) => {
        resolve = settle
      })

      return { promise, resolve }
    }

    function Harness({ answers }: { answers: ReturnType<typeof deferred>[] }) {
      const [shown, setShown] = React.useState<Order[]>(rows)
      const callsRef = React.useRef(0)

      const getData = React.useCallback(
        (_request: unknown, { signal }: { signal: AbortSignal }) => {
          const answer = answers[callsRef.current]
          callsRef.current += 1

          return answer!.promise.then((next) => {
            if (!signal.aborted) setShown(next)
          })
        },
        [answers]
      )

      return (
        <AsyncDataTable<Order>
          columns={columns}
          rows={shown}
          totalItems={100}
          withLastUpdate
          getData={getData}
        />
      )
    }

    it("aborts the previous request when a new one starts", async () => {
      const signals: AbortSignal[] = []
      setup({
        getData: vi.fn((_request, { signal }) => {
          signals.push(signal)
        }),
      })

      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))

      expect(signals).toHaveLength(2)
      expect(signals[0]!.aborted).toBe(true)
      expect(signals[1]!.aborted).toBe(false)
    })

    it("aborts the request in flight on unmount", () => {
      const signals: AbortSignal[] = []
      const { unmount } = setup({
        getData: vi.fn((_request, { signal }) => {
          signals.push(signal)
        }),
      })

      unmount()

      expect(signals[0]!.aborted).toBe(true)
    })

    it("keeps the newer answer when the older one lands after it", async () => {
      const first = deferred()
      const second = deferred()
      const now = vi.spyOn(Date, "now")

      render(<Harness answers={[first, second]} />)

      // A sort starts the second request while the first is still out.
      await userEvent.click(screen.getByRole("button", { name: /^SKU/ }))

      now.mockReturnValue(new Date(2026, 0, 1, 10, 0).getTime())
      await act(async () =>
        second.resolve([{ id: 9, sku: "newer", customer: "", notes: "" }])
      )

      now.mockReturnValue(new Date(2026, 0, 1, 11, 30).getTime())
      await act(async () =>
        first.resolve([{ id: 8, sku: "older", customer: "", notes: "" }])
      )

      expect(screen.getByText("newer")).toBeInTheDocument()
      expect(screen.queryByText("older")).toBeNull()
      // Stamped by the request that won, not by the one that landed last.
      expect(footerSummary()).toHaveTextContent(/updated .*10:00/)
      expect(footerSummary()).not.toHaveTextContent("11:30")

      now.mockRestore()
    })
  })

  describe("app-wide defaults from a DataTableConfigProvider", () => {
    function setupUnder(
      config: DataTableConfig,
      props: Partial<AsyncDataTableProps<Order>>
    ) {
      return render(
        <DataTableConfigProvider config={config}>
          <AsyncDataTable<Order>
            columns={columns}
            rows={rows}
            totalItems={100}
            getData={vi.fn()}
            {...props}
          />
        </DataTableConfigProvider>
      )
    }

    async function autoRefreshChoices() {
      await userEvent.click(
        screen.getByRole("button", { name: "View options" })
      )
      const panel = await screen.findByRole("dialog")
      const group = within(panel).getByRole("group", { name: "Auto-refresh" })

      return within(group)
        .getAllByRole("button")
        .map((button) => button.textContent)
    }

    it("offers the provider’s refresh intervals on a table that names none", async () => {
      setupUnder({ refreshOptions: { intervals: [15000, 60000] } }, {})

      expect(await autoRefreshChoices()).toEqual(["Off", "15 s", "1 min"])
    })

    it("lets a table’s own refresh options win", async () => {
      setupUnder(
        { refreshOptions: { intervals: [15000, 60000] } },
        {
          refreshOptions: { intervals: [30000] },
        }
      )

      expect(await autoRefreshChoices()).toEqual(["Off", "30 s"])
    })

    it("persists the chosen interval for the provider’s user", async () => {
      setupUnder(
        {
          persistState: true,
          userId: 7,
          refreshOptions: { intervals: [15000] },
        },
        { id: "orders" }
      )

      await autoRefreshChoices()
      await userEvent.click(screen.getByRole("button", { name: "15 s" }))

      const stored = JSON.parse(localStorage.getItem("toth-data-table") ?? "{}")
      expect(stored["orders:7"]?.autoRefresh).toEqual({ interval: 15000 })
    })

    it("shows when the rows were fetched, when the provider asks", async () => {
      setupUnder({ withLastUpdate: true }, {})

      await waitFor(() =>
        expect(footerSummary()).toHaveTextContent(/· updated \d/)
      )
    })
  })

  describe("last update", () => {
    it("says when the rows were fetched, when asked", async () => {
      setup({ withLastUpdate: true })

      // Part of the footer's sentence now, not a line of its own above it.
      await waitFor(() =>
        expect(footerSummary()).toHaveTextContent(/· updated \d/)
      )
    })

    it("says nothing by default", () => {
      setup()

      expect(footerSummary()).not.toHaveTextContent("updated")
    })
  })
})
