import { Form, FormActions } from "@toth/form"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { CellField, ToneBadge, sb } from "../../stories/story-kit"
import type { PlainTableCellProps, PlainTableColumn } from "."
import { PlainTable } from "."
import * as React from "react"
import { useWatch } from "react-hook-form"
import { z } from "zod"

// A type alias rather than an interface, so the row shape stays assignable to the table's default
// `Record<string, unknown>` — an interface has no implicit index signature.
type Order = {
  id: string
  reference: string
  customer: string
  warehouse: string
  status: "open" | "picking" | "shipped"
  items: number
  total: number
  placedAt: string
}

const rows: Order[] = [
  {
    id: "1",
    reference: "SO-10241",
    customer: "Northwind Traders",
    warehouse: "Warsaw",
    status: "shipped",
    items: 12,
    total: 1240,
    placedAt: "2026-08-14",
  },
  {
    id: "2",
    reference: "SO-10242",
    customer: "Contoso Ltd",
    warehouse: "Kraków",
    status: "picking",
    items: 3,
    total: 318.5,
    placedAt: "2026-08-15",
  },
  {
    id: "3",
    reference: "SO-10243",
    customer: "Fabrikam Industries",
    warehouse: "Warsaw",
    status: "open",
    items: 47,
    total: 9902.1,
    placedAt: "2026-08-16",
  },
  {
    id: "4",
    reference: "SO-10244",
    customer: "Adventure Works",
    warehouse: "Gdańsk",
    status: "open",
    items: 1,
    total: 89,
    placedAt: "2026-08-17",
  },
]

// A column template is a component, so it receives the whole row and can render anything.
function StatusCell({ row }: PlainTableCellProps<Order>) {
  const tone = {
    open: "secondary",
    picking: "warning",
    shipped: "success",
  } as const

  return <ToneBadge tone={tone[row.status]}>{row.status}</ToneBadge>
}

const columns: PlainTableColumn<Order>[] = [
  { id: "reference", label: "Reference", defaultWidth: 140, isResizable: true },
  { id: "customer", label: "Customer", defaultWidth: 220, isResizable: true },
  { id: "warehouse", label: "Warehouse", defaultWidth: 140 },
  {
    id: "status",
    label: "Status",
    defaultWidth: 120,
    template: StatusCell,
    isAlignable: false,
  },
  { id: "items", label: "Items", defaultWidth: 90, align: "right" },
  // `type` carries what follows from the kind of value: two decimals and a right alignment for a
  // number, and for a date the format and timezone the app set on its `DataTableConfigProvider`.
  { id: "total", label: "Total", defaultWidth: 140, type: "number" },
  { id: "placedAt", label: "Placed", defaultWidth: 130, type: "date" },
]

// Annotated rather than `satisfies`, and with an instantiation expression: `StoryObj<typeof meta>`
// reads the component type back off `meta`, so this is what makes every story's `args` check
// against `Order` instead of collapsing the generic to `unknown`.
const meta: Meta<typeof PlainTable<Order>> = {
  title: "Table/PlainTable",
  component: PlainTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { columns, rows },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/**
 * Hover a header to reveal the chevron beside its label; its menu's Align section sets left, center
 * or right. With an `id` and `persistState` the choice survives a reload.
 */
export const AlignableColumns: Story = {}

/**
 * The column menu: a chevron beside each label, visible on hover or focus (always, where nothing
 * hovers). On its own a `PlainTable` offers Align; `getColumnMenuItems` adds sections around it —
 * here a "Copy column id" row — and a composed `DataTable` adds Sort, Pin and Hide the same way.
 * Status opted out of alignment (`isAlignable: false`) and has nothing else, so it has no chevron.
 */
export const ColumnMenu: Story = {
  args: {
    slotProps: {
      header: {
        getColumnMenuItems: (column, defaults) =>
          column.isAlignable === false
            ? defaults
            : [
                ...defaults,
                {
                  key: "copy",
                  items: [
                    {
                      key: "copy-id",
                      label: "Copy column id",
                      icon: "copy",
                      onSelect: () => navigator.clipboard?.writeText(column.id),
                    },
                  ],
                },
              ],
      },
    },
  },
}

/**
 * Drag a column's edge to resize it — the hairline at the boundary turns into a full-height bar —
 * and double-click it to restore the default width. Arrow keys work too.
 */
export const ResizableColumns: Story = {
  args: {
    columns: columns.map((column) => ({ ...column, isResizable: true })),
  },
}

/**
 * Pinned columns are hoisted to the edges of the row before rendering, because `position: sticky`
 * pins a cell where it already sits. Narrow the viewport below `lg` and pinning drops away —
 * that decision lives in the stylesheet, not in JS.
 */
export const StickyColumns: Story = {
  args: {
    columns: [
      { ...columns[0]!, stickyLeft: true },
      ...columns
        .slice(1, -1)
        .map((column) => ({ ...column, defaultWidth: 260 })),
      { ...columns[columns.length - 1]!, stickyRight: true },
    ],
  },
}

/**
 * A totals row: a `footer` on a column returns its cell, given the rows on screen. The row sticks to
 * the bottom of the scroll area, in a tinted band like the header, and each total sits in its
 * column's alignment. Columns without a `footer` get an empty cell.
 */
export const TotalsFooter: Story = {
  args: {
    columns: [
      {
        ...columns[0]!,
        stickyLeft: true,
        footer: (all) => `Total · ${all.length} orders`,
      },
      ...columns.slice(1, 4),
      {
        ...columns[4]!,
        footer: (all) => all.reduce((sum, row) => sum + row.items, 0),
      },
      {
        ...columns[5]!,
        footer: (all) =>
          all
            .reduce((sum, row) => sum + row.total, 0)
            .toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
      },
      columns[6]!,
    ],
  },
}

/** Nothing to show yet: skeletons stand in for the first page. */
export const Loading: Story = {
  args: { rows: [], loading: true, placeholderRows: 5 },
}

/**
 * A refetch over rows already on screen. The rows stay put under a spinner rather than flashing
 * back to skeletons — the table never shows less than it already knows.
 */
export const RefetchingWithRows: Story = {
  args: { loading: true },
}

export const Empty: Story = {
  args: { rows: [] },
}

/**
 * A failed load is its own state. The old component had none, so a caller whose fetch failed
 * passed `rows={[]}` and the user read "No data" — a different thing, with no way to retry.
 */
export const Failed: Story = {
  args: { rows: [], error: "Could not load orders.", onRetry: () => {} },
}

/** Every visible part is replaceable, and each replacement is typed against the built-in's props. */
export const CustomSlots: Story = {
  args: {
    rows: [],
    slots: {
      noData: ({ className }) => (
        <div
          className={className}
          style={{ padding: "2rem", textAlign: "center" }}
        >
          <strong>No orders in this warehouse</strong>
        </div>
      ),
    },
  },
}

// ===================== form =====================
//
// `PlainTable` next to `@toth/form`: a `<Form>` wraps the whole table and turns every
// editable cell into a live field bound to `items.{rowIndex}.<key>`, so the table draws the grid
// and the form owns every value in it. Ported from the legacy grid's `FormWithPlainTable`
// preview, where the same trick used Formik instead of react-hook-form.

type OrderLine = {
  id: string
  name: string
  sku: string
  qty: number
  warehouse: string
}

const orderLines: OrderLine[] = [
  { id: "1", name: "Widget A", sku: "WID-A", qty: 4, warehouse: "Warsaw" },
  { id: "2", name: "Widget B", sku: "WID-B", qty: 1, warehouse: "Kraków" },
  { id: "3", name: "Widget C", sku: "WID-C", qty: 0, warehouse: "Gdańsk" },
  { id: "4", name: "Widget D", sku: "WID-D", qty: 12, warehouse: "Warsaw" },
]

const WAREHOUSE_OPTIONS = ["Warsaw", "Kraków", "Gdańsk"].map((warehouse) => ({
  value: warehouse,
  label: warehouse,
}))

const orderLinesSchema = z.object({
  items: z.array(
    z.object({
      sku: z.string().min(1, "Required"),
      qty: z.number().min(0, "Min 0"),
      warehouse: z.string().min(1, "Required"),
    })
  ),
})

type OrderLinesValues = z.infer<typeof orderLinesSchema>

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
  const qty = useWatch<OrderLinesValues>({ name: `items.${rowIndex}.qty` }) as
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
      options={WAREHOUSE_OPTIONS}
    />
  )
}

const orderLineColumns: PlainTableColumn<OrderLine>[] = [
  { id: "name", label: "Item", defaultWidth: 160 },
  {
    id: "sku",
    label: "SKU",
    defaultWidth: 140,
    template: SkuCell,
    isAlignable: false,
  },
  {
    id: "qty",
    label: "Qty",
    defaultWidth: 180,
    template: QtyCell,
    isAlignable: false,
  },
  {
    id: "warehouse",
    label: "Warehouse",
    defaultWidth: 160,
    template: WarehouseCell,
    isAlignable: false,
  },
]

function WithInlineFormStory() {
  const [submitted, setSubmitted] = React.useState<OrderLinesValues | null>(
    null
  )

  return (
    <div className={sb.col}>
      <Form
        schema={orderLinesSchema}
        defaultValues={{
          items: orderLines.map(({ sku, qty, warehouse }) => ({
            sku,
            qty,
            warehouse,
          })),
        }}
        onSubmit={setSubmitted}
      >
        <PlainTable columns={orderLineColumns} rows={orderLines} />
        <FormActions actions={[{ kind: "submit", label: "Save" }]} />
      </Form>
      {submitted && (
        <pre className={sb.muted}>
          <code>{JSON.stringify(submitted, null, 2)}</code>
        </pre>
      )}
    </div>
  )
}

/**
 * Type into a cell and the badge beside Qty updates immediately — there is no row data to
 * refresh, every value the table shows already lives in the form. Submit hands back exactly what
 * react-hook-form collected, keyed by row index.
 */
export const WithInlineForm: Story = {
  render: () => <WithInlineFormStory />,
}
