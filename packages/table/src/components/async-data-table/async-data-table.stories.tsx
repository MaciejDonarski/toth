import { Form, FormActions } from "@toth/form"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { CellField, StoryCard, ToneBadge, sb } from "../../stories/story-kit"
import { Button } from "../../internal/button"
import type {
  DataTableColumn,
  DataTableProps,
} from "../data-table/data-table.types"
import type { PlainTableCellProps } from "../plain-table"
import { tableApi } from "../../lib/table-api"
import type { TableSnapshot } from "../../lib/table-registry"
import * as React from "react"
import { useWatch } from "react-hook-form"
import { fn } from "storybook/test"
import { z } from "zod"

import { AsyncDataTable } from "./async-data-table"
import type { DataTableRequest } from "./async-data-table.types"

// The server-backed table, against a server made of a `setTimeout`.
//
// The fake below does what a real backend does — filters, sorts and cuts a page — so these stories
// show the thing that actually matters here: WHEN the table asks. Open the Actions panel and watch
// `getData`: paging, sorting and filtering each cost one call, ticking a row costs none, and hiding
// a column costs none either.

type Order = {
  id: string
  reference: string
  customer: string
  warehouse: string
  status: "open" | "picking" | "shipped"
  items: number
  placedAt: string
}

const CUSTOMERS = [
  "Northwind Traders",
  "Contoso Ltd",
  "Fabrikam",
  "Adventure Works",
  "Tailspin",
]
const WAREHOUSES = ["Warsaw", "Kraków", "Gdańsk"]
const STATUSES: Order["status"][] = ["open", "picking", "shipped"]

/** What the "server" holds. Never handed to the table — only pages of it are. */
const DATABASE: Order[] = Array.from({ length: 240 }, (_, index) => ({
  id: String(index + 1),
  reference: `SO-${10241 + index}`,
  customer: CUSTOMERS[index % CUSTOMERS.length]!,
  warehouse: WAREHOUSES[index % WAREHOUSES.length]!,
  status: STATUSES[index % STATUSES.length]!,
  items: (index % 17) + 1,
  placedAt: `2026-0${(index % 9) + 1}-${String((index % 27) + 1).padStart(2, "0")} 09:30:00`,
}))

const STATUS_VARIANT = {
  open: "gray",
  picking: "warning",
  shipped: "success",
} as const

function StatusCell({ row }: PlainTableCellProps<Order>) {
  return <ToneBadge tone={STATUS_VARIANT[row.status]!}>{row.status}</ToneBadge>
}

const columns: DataTableColumn<Order>[] = [
  { id: "reference", label: "Reference", field: "reference", isSortable: true },
  {
    id: "customer",
    label: "Customer",
    field: "customer_name",
    isSortable: true,
  },
  { id: "warehouse", label: "Warehouse", field: "warehouse" },
  { id: "status", label: "Status", field: "status", template: StatusCell },
  {
    id: "items",
    label: "Items",
    field: "items",
    isSortable: true,
    align: "right",
  },
  // Hidden to start with, so the "showing a column whose field was never fetched refetches, and
  // showing it back does not" behaviour is visible in the request log.
  {
    id: "placedAt",
    label: "Placed",
    field: "placed_at",
    isSortable: true,
    isHidden: true,
  },
]

const filters: DataTableProps<Order>["filters"] = [
  { field: "reference", label: "Reference", order: 10 },
  {
    field: "status",
    label: "Status",
    type: "select",
    order: 20,
    serverField: "status_code",
    options: STATUSES.map((status) => ({ value: status, label: status })),
  },
  {
    field: "warehouse",
    label: "Warehouse",
    type: "multi-select",
    order: 30,
    options: WAREHOUSES.map((warehouse) => ({
      value: warehouse,
      label: warehouse,
    })),
  },
  { field: "items", label: "Items", type: "number", order: 40 },
  { field: "placedAt", label: "Placed", type: "datetime", order: 50 },
]

/** Unwraps the `{ operator, value }` envelope, the way a real backend's filter layer would. */
function unwrap(value: unknown): unknown {
  return value !== null && typeof value === "object" && "operator" in value
    ? (value as unknown as { value: unknown }).value
    : value
}

/** A backend, near enough: it filters, sorts and cuts a page, and takes a moment doing it. */
function query(
  request: DataTableRequest,
  delay = 400
): Promise<{ rows: Order[]; totalItems: number }> {
  let result = DATABASE

  for (const [key, raw] of Object.entries(request.filtering)) {
    const value = unwrap(raw)

    if (key === "reference" && typeof value === "string") {
      result = result.filter((row) =>
        row.reference.toLowerCase().includes(value.toLowerCase())
      )
    }

    if (key === "status_code" && typeof value === "string") {
      result = result.filter((row) => row.status === value)
    }

    if (key === "warehouse" && Array.isArray(value)) {
      result = result.filter((row) =>
        (value as string[]).includes(row.warehouse)
      )
    }

    if (key === "items" && value && typeof value === "object") {
      const { from, to } = value as { from: number | null; to: number | null }
      result = result.filter(
        (row) =>
          (from === null || row.items >= from) &&
          (to === null || row.items <= to)
      )
    }
  }

  if (request.sorting) {
    const { field, dir } = request.sorting
    const key = (
      {
        reference: "reference",
        customer_name: "customer",
        items: "items",
        placed_at: "placedAt",
      } as const
    )[field as "reference" | "customer_name" | "items" | "placed_at"]

    if (key) {
      result = [...result].sort((a, b) => {
        const order = String(a[key]).localeCompare(String(b[key]), undefined, {
          numeric: true,
        })
        return dir === "desc" ? -order : order
      })
    }
  }

  const { currentPage, pageSize } = request.pagination
  const start = (currentPage - 1) * pageSize

  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          rows: result.slice(start, start + pageSize),
          totalItems: result.length,
        }),
      delay
    )
  })
}

/** Holds one page and reports every request, so a story can show what the table asked for. */
function useFakeServer(delay = 400) {
  const [rows, setRows] = React.useState<Order[]>([])
  const [totalItems, setTotalItems] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [log, setLog] = React.useState<DataTableRequest[]>([])

  // The table calls this from an effect; a stable identity keeps it from being a dependency that
  // changes on every render.
  const getData = React.useCallback(
    (request: DataTableRequest) => {
      setLog((previous) => [...previous, request])
      setLoading(true)

      void query(request, delay).then((page) => {
        setRows(page.rows)
        setTotalItems(page.totalItems)
        setLoading(false)
      })
    },
    [delay]
  )

  return { rows, totalItems, loading, log, getData }
}

/** The request log, so the point of these stories is legible without opening the devtools. */
function RequestLog({ log }: { log: DataTableRequest[] }) {
  return (
    <details className={sb.muted}>
      <summary>{log.length} request(s) to the server</summary>
      <pre>{JSON.stringify(log[log.length - 1], null, 2)}</pre>
    </details>
  )
}

const meta: Meta<typeof AsyncDataTable<Order>> = {
  title: "Table/AsyncDataTable",
  component: AsyncDataTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { columns },
}

export default meta
type Story = StoryObj<typeof meta>
type StoryArgs = Parameters<NonNullable<Story["render"]>>[0]

function DefaultStory(args: StoryArgs) {
  const server = useFakeServer()

  return (
    <div className={sb.col}>
      <AsyncDataTable<Order>
        {...args}
        rows={server.rows}
        totalItems={server.totalItems}
        loading={server.loading}
        getData={server.getData}
      />
      <RequestLog log={server.log} />
    </div>
  )
}

/**
 * A table that owns none of its data.
 *
 * It renders in `manual` mode — tracking the state and reporting it rather than acting on it — and
 * turns each report into a `getData` call, but only when the server was actually asked something
 * different. Watch the counter: sorting, paging and filtering each add one; selecting a row and
 * hiding a column add none.
 */
export const Default: Story = {
  render: (args) => <DefaultStory {...args} />,
  args: { withSelection: true, filters },
}

/**
 * Refresh, and the timer behind it.
 *
 * Refresh is one icon: it turns while a request is in flight, its tooltip says when the rows were
 * fetched, and with auto-refresh on it carries a green dot. Auto-refresh is off unless asked for —
 * a table that refetches on its own moves under the reader — and is chosen in View options, which
 * offers Off plus each of `intervals`. The footer appends "· updated 14:32:05 (auto 15 s)".
 */
export const WithRefresh: Story = {
  render: Default.render,
  args: {
    withLastUpdate: true,
    refreshOptions: { intervals: [15_000, 60_000, 300_000] },
  },
}

function WithExportStory(args: StoryArgs) {
  const server = useFakeServer()
  const [exported, setExported] = React.useState<string | null>(null)

  return (
    <div className={sb.col}>
      <AsyncDataTable<Order>
        {...args}
        rows={server.rows}
        totalItems={server.totalItems}
        loading={server.loading}
        getData={server.getData}
        withExport
        exportOptions={{
          onExport: async (request) => {
            await new Promise((resolve) => setTimeout(resolve, 600))
            setExported(JSON.stringify(request, null, 2))
          },
          onError: fn(),
        }}
      />
      {exported ? (
        <details className={sb.muted} open>
          <summary>Last export request</summary>
          <pre>{exported}</pre>
        </details>
      ) : null}
    </div>
  )
}

/**
 * Export, in the three senses anyone means by it: everything there is, everything I have narrowed
 * to, or exactly what is on my screen.
 *
 * `onExport` is the whole coupling to a backend — the table builds the request and the application
 * performs it, which is why nothing in this package knows what a CSV is. Here it just logs.
 */
export const WithExport: Story = {
  render: (args) => <WithExportStory {...args} />,
  args: { filters },
}

/**
 * Which fields the full-text term is matched against is the SERVER's answer, so the table asks for
 * it rather than being told. The box works either way — failing to load the list costs a tooltip,
 * not the feature.
 */
export const WithSearch: Story = {
  render: Default.render,
  args: {
    withSearch: true,
    searchOptions: { domain: "orders" },
    getSearchableFields: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return [
        { field: "reference", label: "Reference" },
        { field: "customer_name", label: "Customer" },
      ]
    },
  },
}

// ===================== form =====================
//
// The same bulk inline-edit trick as `DataTable`'s `WithInlineForm`, scoped to whatever page is
// currently on screen. There is no legacy precedent for this combination — the old grid's async
// preview never paired `AsyncDataTable` with a form — so the shape here is deliberately
// conservative: the form is driven by `values` rather than `defaultValues`, so react-hook-form
// resyncs it every time the server hands back a different page or sort. Editing does not survive
// a page change, because the rows it was editing no longer exist on screen once it does.

type OrderLine = { id: string; sku: string; qty: number; warehouse: string }
type OrderLineValues = {
  items: { sku: string; qty: number; warehouse: string }[]
}

const LINE_WAREHOUSES = ["Warsaw", "Kraków", "Gdańsk"]
const LINE_WAREHOUSE_OPTIONS = LINE_WAREHOUSES.map((warehouse) => ({
  value: warehouse,
  label: warehouse,
}))

/** Its own small "server", entirely separate from `DATABASE` above. */
const LINE_DATABASE: OrderLine[] = Array.from({ length: 42 }, (_, index) => ({
  id: String(index + 1),
  sku: `WID-${String(index + 1).padStart(3, "0")}`,
  qty: index % 5,
  warehouse: LINE_WAREHOUSES[index % LINE_WAREHOUSES.length]!,
}))

const orderLineSchema = z.object({
  items: z.array(
    z.object({
      sku: z.string().min(1, "Required"),
      qty: z.number().min(0, "Min 0"),
      warehouse: z.string().min(1, "Required"),
    })
  ),
})

/** A backend, near enough: it sorts and cuts a page, and takes a moment doing it. */
function queryLines(
  request: DataTableRequest
): Promise<{ rows: OrderLine[]; totalItems: number }> {
  let result = LINE_DATABASE

  if (request.sorting) {
    const { field, dir } = request.sorting
    const key = field as keyof OrderLine

    result = [...result].sort((a, b) => {
      const order = String(a[key]).localeCompare(String(b[key]), undefined, {
        numeric: true,
      })
      return dir === "desc" ? -order : order
    })
  }

  const { currentPage, pageSize } = request.pagination
  const start = (currentPage - 1) * pageSize

  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          rows: result.slice(start, start + pageSize),
          totalItems: result.length,
        }),
      400
    )
  })
}

/** Holds one page of order lines — the same shape as `useFakeServer` above, over its own data. */
function useLineServer() {
  const [rows, setRows] = React.useState<OrderLine[]>([])
  const [totalItems, setTotalItems] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  const getData = React.useCallback((request: DataTableRequest) => {
    setLoading(true)

    void queryLines(request).then((page) => {
      setRows(page.rows)
      setTotalItems(page.totalItems)
      setLoading(false)
    })
  }, [])

  return { rows, totalItems, loading, getData }
}

/** 0 → out of stock, 1 → nearly, more → fine. Read live, off the field the badge sits beside. */
function qtyBadgeVariant(qty: number): "destructive" | "warning" | "success" {
  if (qty === 0) {
    return "destructive"
  }

  if (qty === 1) {
    return "warning"
  }

  return "success"
}

function SkuCell({ rowIndex }: PlainTableCellProps<OrderLine>) {
  return <CellField name={`items.${rowIndex}.sku`} label="SKU" />
}

function QtyCell({ rowIndex }: PlainTableCellProps<OrderLine>) {
  // Scoped to this one path — no need to watch the whole array just to color one badge.
  const qty = useWatch<OrderLineValues>({ name: `items.${rowIndex}.qty` }) as
    number | undefined

  return (
    <div className={sb.row}>
      <CellField
        name={`items.${rowIndex}.qty`}
        label="Qty"
        type="number"
        min={0}
      />
      <ToneBadge tone={qtyBadgeVariant(qty ?? 0)}>{qty ?? 0}</ToneBadge>
    </div>
  )
}

function WarehouseCell({ rowIndex }: PlainTableCellProps<OrderLine>) {
  return (
    <CellField
      name={`items.${rowIndex}.warehouse`}
      label="Warehouse"
      type="select"
      options={LINE_WAREHOUSE_OPTIONS}
    />
  )
}

const orderLineColumns: DataTableColumn<OrderLine>[] = [
  {
    id: "sku",
    label: "SKU",
    field: "sku",
    template: SkuCell,
    isSortable: true,
  },
  { id: "qty", label: "Qty", field: "qty", template: QtyCell },
  {
    id: "warehouse",
    label: "Warehouse",
    field: "warehouse",
    template: WarehouseCell,
    isSortable: true,
  },
]

function WithInlineFormStory() {
  const server = useLineServer()

  function handleSave(values: OrderLineValues) {
    values.items.forEach((item, index) => {
      const row = server.rows[index]
      const target = row && LINE_DATABASE.find((line) => line.id === row.id)

      if (target) {
        Object.assign(target, item)
      }
    })

    tableApi.refresh("storybook-async-inline-form")
  }

  return (
    <div className={sb.col}>
      <Form
        // One form per page: the values are the page on screen, seeded when it arrives.
        key={server.rows.map((row) => row.id).join(",")}
        schema={orderLineSchema}
        defaultValues={{
          items: server.rows.map(({ sku, qty, warehouse }) => ({
            sku,
            qty,
            warehouse,
          })),
        }}
        onSubmit={handleSave}
      >
        <AsyncDataTable<OrderLine>
          id="storybook-async-inline-form"
          columns={orderLineColumns}
          rows={server.rows}
          totalItems={server.totalItems}
          loading={server.loading}
          getData={server.getData}
          paginationOptions={{ pageSize: 6 }}
        />
        <FormActions actions={[{ kind: "submit", label: "Save this page" }]} />
      </Form>
    </div>
  )
}

/**
 * `values` rather than `defaultValues`: the form resyncs to whatever page just loaded, so it never
 * has to reconcile edits against rows that scrolled out of view. Saving writes the page's values
 * back into the "server" and asks the table to refetch, the same way a real mutation would.
 */
export const WithInlineForm: Story = {
  render: () => <WithInlineFormStory />,
}

function EverythingStory(args: StoryArgs) {
  const server = useFakeServer()

  return (
    <div className={sb.col}>
      <AsyncDataTable<Order>
        {...args}
        rows={server.rows}
        totalItems={server.totalItems}
        loading={server.loading}
        getData={server.getData}
        exportOptions={{ onExport: async () => {}, onError: fn() }}
        getSearchableFields={async () => [
          { field: "reference", label: "Reference" },
          { field: "customer_name", label: "Customer" },
        ]}
      />
      <RequestLog log={server.log} />
    </div>
  )
}

/**
 * The whole thing, as a screen would use it — the stand-in for the old grid's async preview page.
 */
export const Everything: Story = {
  render: (args) => <EverythingStory {...args} />,
  args: {
    id: "storybook-async-orders",
    withSelection: true,
    withSearch: true,
    withExport: true,
    withLastUpdate: true,
    withColumnReorder: true,
    withColumnPinning: true,
    filters,
    searchOptions: { domain: "orders" },
    refreshOptions: { intervals: [15_000, 60_000] },
    headerActions: [
      { label: "Add order", icon: "plus", standalone: true, onClick: fn() },
    ],
    rowActions: [
      { label: "View", icon: "arrow-right", onClick: fn() },
      [
        {
          label: "Delete",
          icon: "trash",
          variant: "destructive",
          onClick: fn(),
        },
      ],
    ],
    paginationOptions: { pageSize: 10, sizes: [10, 25, 50] },
  },
}

function EverythingInCardStory(args: StoryArgs) {
  const server = useFakeServer()

  return (
    <div className={sb.col}>
      <StoryCard>
        <AsyncDataTable<Order>
          {...args}
          rows={server.rows}
          totalItems={server.totalItems}
          loading={server.loading}
          getData={server.getData}
          exportOptions={{ onExport: async () => {}, onError: fn() }}
          getSearchableFields={async () => [
            { field: "reference", label: "Reference" },
            { field: "customer_name", label: "Customer" },
          ]}
        />
      </StoryCard>
      <RequestLog log={server.log} />
    </div>
  )
}

export const EverythingInCard: Story = {
  render: (args) => <EverythingInCardStory {...args} />,
  args: {
    id: "storybook-async-orders",
    withSelection: true,
    withSearch: true,
    withExport: true,
    withLastUpdate: true,
    withColumnReorder: true,
    withColumnPinning: true,
    filters,
    searchOptions: { domain: "orders" },
    refreshOptions: { intervals: [15_000, 60_000] },
    headerActions: [
      { label: "Add order", icon: "plus", standalone: true, onClick: fn() },
    ],
    rowActions: [
      { label: "View", icon: "arrow-right", onClick: fn() },
      [
        {
          label: "Delete",
          icon: "trash",
          variant: "destructive",
          onClick: fn(),
        },
      ],
    ],
    paginationOptions: { pageSize: 10, sizes: [10, 25, 50] },
  },
}

// ===================== outside the table =====================

/** A live snapshot of one table's state, read by `id` — subscribed rather than polled. */
function TableSnapshotPanel({ id }: { id: string }) {
  const [snapshot, setSnapshot] = React.useState<TableSnapshot>(
    () => tableApi.getSnapshot(id) ?? {}
  )

  React.useEffect(() => tableApi.subscribe(id, setSnapshot), [id])

  return <pre className={sb.muted}>{JSON.stringify(snapshot, null, 2)}</pre>
}

function ControlledFromOutsideStory(args: StoryArgs) {
  const server = useFakeServer()

  return (
    <div className={sb.col}>
      <div className={sb.row}>
        <Button
          size="sm"
          onClick={() => tableApi.refresh("storybook-async-outside")}
        >
          Refresh
        </Button>
        <Button
          size="sm"
          onClick={() =>
            tableApi.setSort("storybook-async-outside", {
              columnId: "items",
              direction: "desc",
            })
          }
        >
          Sort by items, descending
        </Button>
        <Button
          size="sm"
          onClick={() => tableApi.setPageSize("storybook-async-outside", 5)}
        >
          Set page size to 5
        </Button>
        <Button
          size="sm"
          onClick={() =>
            tableApi.setSelectedIds("storybook-async-outside", ["1", "2"])
          }
        >
          Select rows 1–2
        </Button>
        <Button
          size="sm"
          onClick={() => tableApi.deselectAll("storybook-async-outside")}
        >
          Deselect all
        </Button>
      </div>

      <AsyncDataTable<Order>
        {...args}
        id="storybook-async-outside"
        rows={server.rows}
        totalItems={server.totalItems}
        loading={server.loading}
        getData={server.getData}
      />

      <RequestLog log={server.log} />
      <TableSnapshotPanel id="storybook-async-outside" />
    </div>
  )
}

/**
 * `refresh(id)` is the one scope only an async table registers — it is how a plugin, or anything
 * else outside the tree, refetches the page after a mutation it ran itself, mirroring
 * `api.table.refresh(id)` in the old grid's CRUD/activation plugins. `setSort` / `setPageSize`
 * work here exactly as they do on a plain `DataTable`; the request log below shows each one
 * costing the single fetch it should.
 */
export const ControlledFromOutside: Story = {
  render: (args) => <ControlledFromOutsideStory {...args} />,
  args: { withSelection: true },
}

// ===================== a real backend =====================
//
// Everything above talks to a `setTimeout`. This one talks to whatever `SN_API_TARGET` in
// `.env.local` points at, through the proxy `config/api-proxy.ts` sets up — the same path
// `Barcode`'s stories travel, and the one that file's own comment names table stories as the next
// thing to use it: "table stories on live data will travel the same path without touching this
// file again."
//
// The query is a deliberately minimal, hand-written GraphQL request against the real `product`
// domain and its `grid` field — the exact shape the legacy grid's own
// `AsyncDataTablePreview` used (`gql.getGraphQLGrid`), reproduced by hand here rather than by
// depending on that package: `POST /api/query` with `{ query, context }`, a response shaped
// `{ data: { product: { grid: { totalSize, rows } } } }`, and a filter operator vocabulary of
// `eq` / `in` / `between` / `like` that lines up with the envelopes `DataTableRequest.filtering`
// already produces. A real application's data layer will have a complete query builder matching
// its own schema; this is only enough to prove the round trip.
//
// Same-origin, so the browser attaches no credentials itself — the DEV SERVER is what carries the
// session cookie into the real backend (see `config/api-proxy.ts`), which is also why this only
// ever works under `storybook dev`, never in `pnpm test:stories` or a static `build-storybook`.

type ProductRow = {
  id: string
  sku: string
  name: string
  weight: number
  qty_on_hand: number
  qty_available: number
  created_at: string
}

const PRODUCT_COLUMNS: DataTableColumn<ProductRow>[] = [
  { id: "sku", label: "SKU", field: "sku", isSortable: true, stickyLeft: true },
  {
    id: "name",
    label: "Name",
    field: "name",
    isSortable: true,
    isResizable: true,
    defaultWidth: 320,
  },
  {
    id: "weight",
    label: "Weight",
    field: "weight",
    isSortable: true,
    align: "right",
  },
  {
    id: "qty_on_hand",
    label: "Qty on hand",
    field: "qty_on_hand",
    align: "right",
  },
  {
    id: "qty_available",
    label: "Qty available",
    field: "qty_available",
    align: "right",
  },
  {
    id: "created_at",
    label: "Created",
    field: "created_at",
    isSortable: true,
    sortDir: "desc",
  },
]

const PRODUCT_FILTERS: DataTableProps<ProductRow>["filters"] = [
  { field: "sku", label: "SKU", order: 10 },
  { field: "weight", label: "Weight", type: "number", order: 20 },
]

/** A GraphQL-safe string literal: backslashes and quotes escaped, wrapped in `"…"`. */
function gqlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

/** A value in the shape the confirmed grid grammar expects on the right of `value:`. */
function gqlValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(gqlValue).join(", ")}]`
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return gqlString(String(value ?? ""))
}

/**
 * One filter clause, in the operator vocabulary the real grid resolver understands. Reproduces
 * only the shapes `prepareServerFiltering` actually emits — the enveloped `{operator,value}` our
 * select/tags filters send, the bare array a multi-select sends, the `{from,to}` a range sends,
 * and a bare scalar (our text filters) as a `like` match, exactly as the legacy builder's own
 * fallback branch does.
 */
function gqlFilterClause(field: string, stored: unknown): string | null {
  if (stored === null || stored === undefined || stored === "") {
    return null
  }

  if (
    typeof stored === "object" &&
    !Array.isArray(stored) &&
    "operator" in stored
  ) {
    const { operator, value } = stored as { operator: string; value: unknown }
    return `${field}: { operator: ${operator}, value: ${gqlValue(value)} }`
  }

  if (Array.isArray(stored)) {
    return `${field}: { operator: in, value: ${gqlValue(stored)} }`
  }

  if (typeof stored === "object" && ("from" in stored || "to" in stored)) {
    const { from, to } = stored as { from: unknown; to: unknown }
    return `${field}: { operator: between, value: ${gqlValue([from, to])} }`
  }

  return `${field}: { operator: like, value: ${gqlString(`%${String(stored)}%`)} }`
}

function buildProductQuery(request: DataTableRequest): string {
  const sort = request.sorting
    ? `sort: { ${request.sorting.field}: ${request.sorting.dir === "desc" ? "DESC" : "ASC"} }`
    : ""

  const clauses = Object.entries(request.filtering)
    .map(([field, value]) => gqlFilterClause(field, value))
    .filter((clause): clause is string => clause !== null)
  const filter = clauses.length > 0 ? `filter: { ${clauses.join(", ")} }` : ""

  const limit = `limit: { size: ${request.pagination.pageSize}, page: ${request.pagination.currentPage} }`

  return (
    "query V1Queries { product { grid( " +
    `${sort} ${filter} ${limit}` +
    " ) { totalSize, rows { id sku name weight qty_on_hand qty_available created_at } } } }"
  )
}

/**
 * The real fetch. `context` uses the account's own date settings — `:me` is the legacy builder's
 * own default rather than a value invented here.
 */
async function fetchProductPage(
  request: DataTableRequest
): Promise<{ rows: ProductRow[]; totalItems: number }> {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: buildProductQuery(request),
      context: {
        output_date_format: ":me",
        output_date_time_format: ":me",
        output_date_timezone: ":me",
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  const body = (await response.json()) as {
    errors?: { message: string }[]
    data?: { product?: { grid?: { totalSize: number; rows: ProductRow[] } } }
  }

  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "))
  }

  const grid = body.data?.product?.grid

  if (!grid) {
    throw new Error("Unexpected response shape from /api/query.")
  }

  return { rows: grid.rows, totalItems: grid.totalSize }
}

/** As `useFakeServer`, but backed by the real fetch above, and able to fail. */
function useLiveServer() {
  const [rows, setRows] = React.useState<ProductRow[]>([])
  const [totalItems, setTotalItems] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const lastRequestRef = React.useRef<DataTableRequest | null>(null)

  const runRequest = React.useCallback((request: DataTableRequest) => {
    lastRequestRef.current = request
    setLoading(true)
    setError(null)

    fetchProductPage(request)
      .then((page) => {
        setRows(page.rows)
        setTotalItems(page.totalItems)
        setLoading(false)
      })
      .catch((caught: unknown) => {
        // No backend configured (a fresh clone, CI) fails exactly like this — a network
        // error or a 404 from the dev server's own catch-all. That is the honest state,
        // not a bug in the story; see the module comment above and `Barcode`'s stories.
        setError(
          caught instanceof Error ? caught.message : "Something went wrong."
        )
        setLoading(false)
      })
  }, [])

  const retry = React.useCallback(() => {
    if (lastRequestRef.current) runRequest(lastRequestRef.current)
  }, [runRequest])

  return { rows, totalItems, loading, error, getData: runRequest, retry }
}

function LiveBackendStory() {
  const server = useLiveServer()

  return (
    <AsyncDataTable<ProductRow>
      id="storybook-live-products"
      columns={PRODUCT_COLUMNS}
      rows={server.rows}
      totalItems={server.totalItems}
      loading={server.loading}
      error={server.error}
      onRetry={server.retry}
      getData={server.getData}
      filters={PRODUCT_FILTERS}
      withLastUpdate
    />
  )
}

/**
 * No story here may assert that a row loaded — the fallback (an error, with a working retry) is
 * the only state guaranteed everywhere this runs, `pnpm test:stories` and a fresh clone included.
 * Configure `SN_API_TARGET` / `SN_API_USER` / `SN_API_PASSWORD` in `.env.local` and restart
 * `pnpm dev` to see the real rows.
 */
export const LiveBackend: Story = {
  render: () => <LiveBackendStory />,
}

function WorkbenchStory(args: StoryArgs) {
  const server = useFakeServer(450)

  return (
    <div className={sb.col}>
      <AsyncDataTable<Order>
        {...args}
        rows={server.rows}
        totalItems={server.totalItems}
        loading={server.loading}
        getData={server.getData}
      />
      <RequestLog log={server.log} />
    </div>
  )
}

/**
 * Variant B, "Workbench", against a server that takes 450 ms to answer — every part at once:
 *
 * - Refresh turns while a request is out and, with auto-refresh on (View options → 15 s), carries
 *   a green dot; the footer says when the rows were fetched;
 * - Export and four more table actions on the right, two as buttons and the rest in "⋯";
 * - Filters in a panel over the rows, the chips beneath the toolbar;
 * - ticking rows swaps the toolbar for the bulk bar — "Select all 240 matching" makes the
 *   selection `mode: 'all'`, which only a server can act on, so the bulk actions are handed the
 *   server-shaped filters as well;
 * - the eye in each row opens a quick view, stepping through the page.
 */
export const Workbench: Story = {
  render: (args) => <WorkbenchStory {...args} />,
  args: {
    id: "workbench-orders",
    withSearch: true,
    withSelection: true,
    withExport: true,
    withLastUpdate: true,
    withColumnReorder: true,
    withColumnPinning: true,
    itemsLabel: "orders",
    filters,
    getRowLabel: (row) => row.reference,
    selectionOptions: { selectAllMatching: true },
    refreshOptions: { intervals: [15_000, 60_000] },
    exportOptions: {
      // The file takes a moment; the table says it is busy meanwhile.
      onExport: () => new Promise<void>((resolve) => setTimeout(resolve, 800)),
    },
    headerActions: [
      { label: "Print pick lists", icon: "clipboard-list", onClick: fn() },
      { label: "Import orders from CSV", icon: "download", onClick: fn() },
      { label: "Sync sales channels", icon: "refresh-cw", onClick: fn() },
      [{ label: "Archive shipped orders", icon: "box", onClick: fn() }],
    ],
    bulkActions: ({ count, mode }) => [
      { label: "Print labels", icon: "download", onClick: fn() },
      { label: "Assign warehouse", icon: "store", onClick: fn() },
      {
        label: "Cancel orders",
        icon: "trash",
        variant: "destructive",
        onClick: fn(),
        confirm: {
          title:
            mode === "all"
              ? `Cancel all ${count} orders?`
              : `Cancel ${count} orders?`,
          description: "Their stock is released. Shipped orders are skipped.",
          confirmLabel: "Cancel orders",
          cancelLabel: "Keep orders",
        },
      },
    ],
    rowPreview: {
      title: (row) => row.reference,
      subtitle: (row) => `${row.customer} · ${row.warehouse}`,
      render: (row) => (
        <dl className={sb.col}>
          <dt className={sb.muted}>Status</dt>
          <dd>
            <StatusCell row={row} column={columns[3]!} rowIndex={0} />
          </dd>
          <dt className={sb.muted}>Items</dt>
          <dd>{row.items}</dd>
          <dt className={sb.muted}>Placed</dt>
          <dd>{row.placedAt}</dd>
        </dl>
      ),
    },
  },
}
