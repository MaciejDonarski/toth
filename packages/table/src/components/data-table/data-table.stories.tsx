import { Form, FormActions } from "@toth/form"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  CellField,
  DescriptionList,
  ToneBadge,
  sb,
} from "../../stories/story-kit"
import { Button } from "../../internal/button"
import { ToggleGroup, ToggleGroupItem } from "@toth/ui/components/toggle-group"
import type { PlainTableCellProps, PlainTableColumn } from "../plain-table"
import { PlainTable } from "../plain-table"
import { tableApi } from "../../lib/table-api"
import type { TableSnapshot } from "../../lib/table-registry"
import * as React from "react"
import { useWatch } from "react-hook-form"
import { fn } from "storybook/test"
import { z } from "zod"

import { DataTable } from "./data-table"
import type { DataTableColumn, DataTableProps } from "./data-table.types"

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
  tags: string[]
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
const TAGS = ["priority", "fragile", "backorder"]

// Generated rather than written out: paging, the page-size control and the "1 to 25 of 120"
// sentence are only worth looking at against more rows than anyone wants to read in a file.
const rows: Order[] = Array.from({ length: 120 }, (_, index) => ({
  id: String(index + 1),
  reference: `SO-${10241 + index}`,
  customer: CUSTOMERS[index % CUSTOMERS.length]!,
  warehouse: WAREHOUSES[index % WAREHOUSES.length]!,
  status: STATUSES[index % STATUSES.length]!,
  items: (index % 17) + 1,
  total: Math.round((index % 23) * 137.5 * 100) / 100,
  placedAt: `2026-0${(index % 9) + 1}-${String((index % 27) + 1).padStart(2, "0")} 09:30:00`,
  tags: index % 4 === 0 ? [TAGS[index % TAGS.length]!] : [],
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
  {
    id: "reference",
    label: "Reference",
    field: "reference",
    isSortable: true,
    isResizable: true,
  },
  {
    id: "customer",
    label: "Customer",
    field: "customer_name",
    isSortable: true,
    isResizable: true,
  },
  { id: "warehouse", label: "Warehouse", field: "warehouse", isSortable: true },
  { id: "status", label: "Status", field: "status", template: StatusCell },
  {
    id: "items",
    label: "Items",
    field: "items",
    isSortable: true,
    align: "right",
  },
  // `type` and nothing else: two decimals and a right alignment follow from being a number, and
  // the date format and timezone from the app's `DataTableConfigProvider`.
  {
    id: "total",
    label: "Total",
    field: "total",
    isSortable: true,
    type: "number",
  },
  {
    id: "placedAt",
    label: "Placed",
    field: "placed_at",
    isSortable: true,
    sortDir: "desc",
    type: "datetime",
  },
]

const filters: DataTableProps<Order>["filters"] = [
  { field: "reference", label: "Reference", order: 10 },
  {
    field: "status",
    label: "Status",
    type: "select",
    order: 20,
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
  { field: "tags", label: "Tags", type: "tags", order: 60 },
]

// Annotated rather than `satisfies`, and with an instantiation expression — the same reason
// `PlainTable`'s stories give: `StoryObj<typeof meta>` reads the component type back off `meta`,
// and that is what makes every story's `args` check against `Order` instead of collapsing the
// generic to `unknown`.
const meta: Meta<typeof DataTable<Order>> = {
  title: "Table/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { columns, rows },
}

export default meta
type Story = StoryObj<typeof meta>
type StoryArgs = Parameters<NonNullable<Story["render"]>>[0]

/**
 * A table someone can use: sortable columns, a pager, and the Columns panel — which is on by
 * default, because hiding a column is the commonest thing a reader wants from a wide table.
 *
 * Nothing here is server-backed. The table filters, sorts and pages the rows it was given.
 */
export const Default: Story = {}

// ===================== workbench =====================

type WorkbenchLine = {
  id: string
  sku: string
  name: string
  ordered: number
  picked: number
  total: number
}

/** A few lines per order, derived from it so the quick view always has something to total. */
function workbenchLines(order: Order): WorkbenchLine[] {
  const count = (Number(order.id) % 4) + 2

  return Array.from({ length: count }, (_, index) => {
    const ordered = ((Number(order.id) + index) % 5) + 1

    return {
      id: `${order.id}-${index}`,
      sku: `SKU-${1000 + ((Number(order.id) * 7 + index * 13) % 900)}`,
      name: [
        "Cable organiser",
        "Desk lamp",
        "USB-C hub",
        "Notebook, A5",
        "Mug",
      ][index % 5]!,
      ordered,
      picked: index === 0 && order.status === "picking" ? ordered - 1 : ordered,
      total: ordered * (12.5 + index * 4),
    }
  })
}

const workbenchLineColumns: PlainTableColumn<WorkbenchLine>[] = [
  {
    id: "sku",
    label: "SKU",
    defaultWidth: 90,
    footer: (all) => `${all.length} lines`,
  },
  { id: "name", label: "Product", defaultWidth: 120 },
  {
    id: "ordered",
    label: "Qty",
    align: "right",
    defaultWidth: 50,
    footer: (all) => all.reduce((sum, line) => sum + line.ordered, 0),
  },
  {
    id: "picked",
    label: "Picked",
    align: "right",
    defaultWidth: 60,
    footer: (all) => all.reduce((sum, line) => sum + line.picked, 0),
  },
  {
    id: "total",
    label: "Total",
    type: "number",
    defaultWidth: 70,
    footer: (all) => all.reduce((sum, line) => sum + line.total, 0).toFixed(2),
  },
]

/**
 * Variant B, "Workbench" — the whole table at once, on 120 orders held in the browser.
 *
 * The page header keeps the one action that creates something ("Add order"); the table's own
 * actions are on the right of its toolbar, two as buttons and three in "⋯". Filters open over the
 * rows; ticking a row swaps the toolbar for the bulk bar; the eye in a row opens its quick view,
 * whose lines are a `PlainTable` with a totals row. View options switches density, column dividers
 * and which columns show.
 *
 * Compare it at 1440px with `table-b-workbench.html`.
 */
export const Workbench: Story = {
  render: (args) => (
    <div className={sb.col}>
      <div className={sb.row}>
        <h1 className={sb.strong}>Orders</h1>
        <Button icon="plus" onClick={fn()}>
          Add order
        </Button>
      </div>
      <DataTable<Order> {...args} />
    </div>
  ),
  args: {
    id: "workbench-orders-local",
    withSearch: true,
    withSelection: true,
    withColumnReorder: true,
    withColumnPinning: true,
    withAdjustHeight: true,
    itemsLabel: "orders",
    filters,
    columns: [{ ...columns[0]!, stickyLeft: true }, ...columns.slice(1)],
    getRowLabel: (row) => row.reference,
    headerActions: [
      { label: "Print pick lists", icon: "clipboard-list", onClick: fn() },
      {
        label: "Export",
        icon: "file-down",
        menuItems: [
          { key: "all", label: "Everything", onClick: fn() },
          { key: "visible", label: "All rows, visible columns", onClick: fn() },
          { key: "page", label: "This page", onClick: fn() },
        ],
      },
      { label: "Import orders from CSV", icon: "download", onClick: fn() },
      { label: "Sync sales channels", icon: "refresh-cw", onClick: fn() },
      [{ label: "Archive shipped orders", icon: "box", onClick: fn() }],
    ],
    bulkActions: ({ count }) => [
      { label: "Print labels", icon: "download", onClick: fn() },
      { label: "Assign warehouse", icon: "store", onClick: fn() },
      {
        label: "Cancel orders",
        icon: "trash",
        variant: "destructive",
        onClick: fn(),
        confirm: {
          title: `Cancel ${count} ${count === 1 ? "order" : "orders"}?`,
          description: "Their stock is released. Shipped orders are skipped.",
          confirmLabel: "Cancel orders",
          cancelLabel: "Keep orders",
        },
      },
    ],
    rowActions: [
      { label: "Open order", icon: "arrow-right", onClick: fn() },
      { label: "Print label", icon: "download", onClick: fn() },
      [
        {
          label: "Cancel order",
          icon: "trash",
          variant: "destructive",
          onClick: fn(),
        },
      ],
    ],
    rowPreview: {
      title: (row) => row.reference,
      subtitle: (row) => `${row.customer} · placed ${row.placedAt}`,
      render: (row) => (
        <>
          <DescriptionList
            data={row}
            items={[
              {
                key: "status",
                term: "Status",
                render: () => (
                  <StatusCell row={row} column={columns[3]!} rowIndex={0} />
                ),
              },
              { key: "warehouse", term: "Warehouse" },
              { key: "items", term: "Items" },
              {
                key: "total",
                term: "Total",
                render: (value) => Number(value).toFixed(2),
              },
            ]}
          />
          <PlainTable<WorkbenchLine>
            columns={workbenchLineColumns}
            rows={workbenchLines(row)}
          />
        </>
      ),
      footer: () => (
        <Button variant="outline" icon="arrow-right" onClick={fn()}>
          Open order
        </Button>
      ),
    },
  },
}

// ===================== sorting =====================

/**
 * `isSortable` puts a control in the header, and `sortDir` on a column decides what the table opens
 * sorted by — this one opens newest-first without the caller repeating the column id anywhere.
 *
 * Clicking cycles ascending → descending → off. The direction is announced with `aria-sort` on the
 * column header, which is where a screen reader looks for it.
 */
export const Sorted: Story = {
  args: {
    sortOptions: { defaultSort: { columnId: "total", direction: "desc" } },
  },
}

// ===================== selection =====================

/**
 * `withSelection` adds the checkbox column, pinned to the leading edge so it never scrolls away
 * from the row it belongs to.
 *
 * The header box selects or clears THIS PAGE, which is what a header checkbox in a paginated table
 * is understood to do. "Select all", which reaches rows that are not on screen, is a separate named
 * choice in the menu beside it.
 */
export const WithSelection: Story = {
  args: { withSelection: true, onSelectedIdsChange: fn() },
}

/** Rows the caller will not act on: the box is there, and disabled, rather than missing. */
export const WithExcludedRows: Story = {
  args: {
    withSelection: true,
    selectionOptions: { excludedIds: ["1", "2", "3"] },
  },
}

/**
 * Tick a row and the toolbar gives way to the bulk bar: the count, "Select all 120 matching", Clear,
 * the actions and a close button. `bulkActions` as a function is handed what is selected, so the
 * destructive action can say how many orders it will cancel — and, with `confirm`, it asks first.
 *
 * The header's chevron holds the four selection choices; the box beside it acts on this page, and
 * shows a dash whenever something is selected that is not this whole page.
 */
export const BulkActions: Story = {
  args: {
    withSelection: true,
    withSearch: true,
    itemsLabel: "orders",
    getRowLabel: (row) => row.reference,
    bulkActions: ({ count }) => [
      { label: "Print labels", icon: "download", onClick: fn() },
      { label: "Assign warehouse", icon: "store", onClick: fn() },
      {
        label: "Cancel orders",
        icon: "trash",
        variant: "destructive",
        onClick: fn(),
        confirm: {
          title: `Cancel ${count} ${count === 1 ? "order" : "orders"}?`,
          description: "Their stock is released. Shipped orders are skipped.",
          confirmLabel: "Cancel orders",
          cancelLabel: "Keep orders",
        },
      },
    ],
  },
}

/**
 * The eye in each row opens a quick view over the rows — never a click on the row itself. The
 * arrows in its header step through the page, and another row's eye switches it to that row.
 * Escape, or the eye again, closes it and puts focus back on that row's eye; a press anywhere else
 * outside it closes it too. Opening Filters closes it, and the other way round. Below 768px it covers
 * the screen, with Previous · 2 of 25 · Next at the bottom.
 *
 * The content is the screen's: here a description list and a small `PlainTable` of order lines.
 */
export const QuickView: Story = {
  args: {
    filters,
    itemsLabel: "orders",
    rowActions: [
      { label: "Open order", icon: "arrow-right", onClick: fn() },
      {
        label: "Cancel order",
        icon: "trash",
        variant: "destructive",
        onClick: fn(),
      },
    ],
    rowPreview: {
      title: (row) => row.reference,
      subtitle: (row) => `${row.customer} · ${row.warehouse}`,
      render: (row) => (
        <DescriptionList
          data={row}
          items={[
            {
              key: "status",
              term: "Status",
              render: () => (
                <StatusCell row={row} column={columns[3]!} rowIndex={0} />
              ),
            },
            { key: "warehouse", term: "Warehouse" },
            { key: "items", term: "Items" },
            {
              key: "total",
              term: "Total",
              render: (value) => Number(value).toFixed(2),
            },
            { key: "placedAt", term: "Placed" },
          ]}
        />
      ),
      footer: () => (
        <>
          <Button variant="outline" icon="arrow-right" onClick={fn()}>
            Open order
          </Button>
        </>
      ),
    },
  },
}

function NarrowContainerStory(args: StoryArgs) {
  const [width, setWidth] = React.useState("734")

  return (
    <div className={sb.col}>
      <ToggleGroup
        aria-label="Container width"
        className={sb.wMd}
        value={[width]}
        onValueChange={(value) => {
          if (value[0]) setWidth(value[0])
        }}
      >
        <ToggleGroupItem value="360">360 px</ToggleGroupItem>
        <ToggleGroupItem value="734">734 px</ToggleGroupItem>
        <ToggleGroupItem value="990">990 px</ToggleGroupItem>
      </ToggleGroup>
      <div key={width} className={sb.resizable} style={{ width: `${width}px` }}>
        <DataTable<Order> {...args} />
      </div>
    </div>
  )
}

/**
 * The table answers to its OWN width, not the window's: drag the box's corner, or pick a width.
 * `data-size` on the root reads `sm` below 640px, `md` to 960px, `lg` above.
 *
 * - **lg** — everything in the toolbar, two table actions as buttons, pinned columns stick;
 * - **md** — the second table action moves into "⋯"; pinning still on;
 * - **sm** — search on a row of its own, Filters and View options beside "⋯" (Refresh and every
 *   table action are in it), the chips in one line that scrolls, the pager down to the current
 *   page, nothing pinned.
 *
 * What depends on the WINDOW (below 768px) is separate: full-screen panels, the bulk bar docked at
 * the bottom, no column menus.
 */
export const NarrowContainer: Story = {
  render: (args) => <NarrowContainerStory {...args} />,
  args: {
    withSearch: true,
    withSelection: true,
    withColumnPinning: true,
    itemsLabel: "orders",
    // Two filters in force from the start, so the chips have something to show at every width.
    filters: filters?.map((filter) =>
      filter.field === "status"
        ? { ...filter, defaultValue: "open" }
        : filter.field === "warehouse"
          ? { ...filter, defaultValue: ["Warsaw", "Kraków"] }
          : filter
    ) as DataTableProps<Order>["filters"],
    columns: [{ ...columns[0]!, stickyLeft: true }, ...columns.slice(1)],
    headerActions: [
      { label: "Print pick lists", icon: "clipboard-list", onClick: fn() },
      { label: "Export", icon: "file-down", onClick: fn() },
      { label: "Import orders from CSV", icon: "download", onClick: fn() },
    ],
    rightActions: [
      {
        label: "Refresh",
        icon: "refresh-cw",
        size: "icon",
        variant: "ghost",
        standalone: true,
        onClick: fn(),
      },
    ],
  },
}

// ===================== actions =====================

/**
 * The row menu, declared once for the table and resolved per row — so `disabled: (row) => …` is
 * written once rather than an action array being rebuilt for each of 120 rows.
 */
export const WithRowActions: Story = {
  args: {
    rowActions: [
      { label: "View", icon: "arrow-right", onClick: fn() },
      { label: "Edit", icon: "pencil", onClick: fn() },
      [
        {
          label: "Delete",
          icon: "trash",
          variant: "destructive",
          // Per row: a shipped order is not one to delete.
          disabled: (row: Order) => row.status === "shipped",
          onClick: fn(),
        },
      ],
    ],
  },
}

/**
 * An action can be promoted out of the menu to a button in the cell, and the column widens to hold
 * it: `standalone: true` everywhere, `'desktop'` only from the `md` breakpoint (768px) up, where a
 * row of buttons has the room. Narrow the frame past that point and Edit goes back into the menu and
 * the column back to one trigger.
 *
 * It costs that width in every row of the table, so it is worth it for the one action that is always
 * the next thing someone does, and rarely for a second. A promoted action needs an `icon` — the
 * buttons are 28px squares with no room for a label — and one without stays a menu row.
 */
export const WithStandaloneRowActions: Story = {
  args: {
    rowActions: [
      {
        label: "View",
        icon: "arrow-right",
        title: "View",
        standalone: true,
        onClick: fn(),
      },
      {
        label: "Edit",
        icon: "pencil",
        title: "Edit",
        standalone: "desktop",
        onClick: fn(),
      },
      { label: "Duplicate", icon: "file-down", onClick: fn() },
      [
        {
          label: "Delete",
          icon: "trash",
          variant: "destructive",
          onClick: fn(),
        },
      ],
    ],
  },
}

/**
 * A `size` other than the cell's default draws the label alongside the icon instead of hiding it —
 * useful for the one action that should read as a call to action rather than an icon a reader has to
 * already know. It needs no `icon` at all once `size` says the button has room for a label.
 *
 * The column cannot work out how wide that label makes the button — widths here are computed, not
 * measured — so this always needs `rowActionsColumnWidth` alongside it. Leaving it out, or picking a
 * width the label does not fit, warns in development and does not resize the column on its own.
 */
export const WithLabelledRowAction: Story = {
  args: {
    rowActions: [
      { label: "Approve", size: "sm", standalone: true, onClick: fn() },
      { label: "Edit", icon: "pencil", onClick: fn() },
      [
        {
          label: "Delete",
          icon: "trash",
          variant: "destructive",
          onClick: fn(),
        },
      ],
    ],
    rowActionsColumnWidth: 140,
  },
}

/**
 * The toolbar's two clusters: finding and viewing on the left (search, Filters, Columns), what can
 * be done to the whole dataset on the right. At most two of those actions are buttons — the rest
 * are in "More table actions" (`toolbarOptions.maxVisibleActions` moves the cap).
 *
 * "Add order" is not here on purpose: creating a record is the page's action, and it goes in the
 * page header, not in the table.
 */
export const WithHeaderActions: Story = {
  args: {
    withSearch: true,
    filters,
    headerActions: [
      { label: "Print pick lists", icon: "clipboard-list", onClick: fn() },
      { label: "Export", icon: "file-down", onClick: fn() },
      { label: "Import orders from CSV", icon: "download", onClick: fn() },
      { label: "Sync sales channels", icon: "refresh-cw", onClick: fn() },
      [{ label: "Archive shipped orders", icon: "box", onClick: fn() }],
    ],
  },
}

// ===================== filtering =====================

/**
 * Every filter type at once, behind the Filters panel.
 *
 * The panel is a real `<Form>` from `@toth/form`, and each filter renders as the field its
 * type calls for: text, dropdown, multi-select dropdown, number range, date range with quick
 * ranges, tags. It applies as you type, on a debounce.
 *
 * The chips underneath say what is in force, because a panel behind a popover hides its own state —
 * without them a reader coming back to a pre-filtered table sees fewer rows and nothing saying why.
 */
export const WithFilters: Story = {
  args: { filters },
}

/**
 * Filters open in a panel that slides in from the right over the rows — the table keeps its width
 * and the form applies as you edit. Escape, the X or Done closes it and puts focus back on the
 * Filters button, whose pill counts what is in force; so does a press anywhere outside it — the
 * rows, the chips, the page — except in the lists and calendars its own fields open. The Filters
 * button toggles it. Below 768px the panel takes the whole screen and ends in "Show N orders".
 *
 * `filtersOptions.container: 'popover'` keeps the earlier dropdown.
 */
export const FiltersSheet: Story = {
  args: {
    filters,
    withSearch: true,
    withSelection: true,
    itemsLabel: "orders",
  },
}

/**
 * The panel over a table filtered down to two rows, in a height-fitted table. The table body keeps
 * a floor while a panel is up — `--data-table-sheet-min-height`, `24rem` unless an application
 * sets it — so the form is not a sliver with Reset and Done cropped off; it scrolls inside the
 * panel instead. A taller table is untouched.
 */
export const FiltersSheetOverFewRows: Story = {
  args: {
    filters,
    withAdjustHeight: true,
    rows: rows.slice(0, 2),
  },
}

/** Filters behind an Apply button, for a table where every change is an expensive request. */
export const WithFiltersOnSubmit: Story = {
  args: { filters, filtersOptions: { submitOnChange: false } },
}

/** A table that opens already narrowed, from a filter's own `defaultValue`. */
export const WithDefaultFilter: Story = {
  args: {
    filters: [
      {
        field: "status",
        label: "Status",
        type: "select",
        defaultValue: "open",
        options: STATUSES.map((status) => ({ value: status, label: status })),
      },
    ],
  },
}

/**
 * The full-text box.
 *
 * Client-side it matches the fields it is given, and its tooltip lists them — which is the answer
 * to "why did that not find anything?".
 */
export const WithSearch: Story = {
  args: {
    withSearch: true,
    searchOptions: {
      searchableFields: [
        { field: "reference", label: "Reference" },
        { field: "customer", label: "Customer" },
      ],
    },
  },
}

/** The full-text box behind a submit button, for a search that is an expensive request. */
export const WithSearchOnSubmit: Story = {
  args: {
    withSearch: true,
    searchOptions: { submitOnChange: false },
  },
}

// ===================== columns =====================

/**
 * The Columns panel doing all three of its jobs: visibility, order and pinning.
 *
 * Reordering is dragging AND arrow keys — `@dnd-kit`'s keyboard sensor is wired up, which is the
 * only reason a drag-and-drop dependency is defensible in a component library.
 */
export const WithColumnLayout: Story = {
  args: {
    withColumnReorder: true,
    withColumnPinning: true,
    columns: columns.map((column) =>
      column.id === "reference" ? { ...column, stickyLeft: true } : column
    ),
  },
}

/**
 * Persisted per table id — and per user, where a machine is shared. Reload to see it kept.
 *
 * The user half is not in the args: `userId` is one of the props an application sets once, for
 * every table at once, through a `DataTableConfigProvider` near its root. The catalogue's lives in
 * `.storybook/preview.tsx`, so this story writes under `storybook-orders:sb-user-42` without
 * naming a user anywhere.
 */
export const Persisted: Story = {
  args: {
    id: "storybook-orders",
    persistState: true,
    withColumnReorder: true,
    withColumnPinning: true,
  },
}

// ===================== layout =====================

/**
 * `withAdjustHeight` caps the table at the bottom of the window instead of letting it grow to its
 * content, so the rows become the only part that scrolls: the header row stays put and the pager
 * stays on screen however many rows the page holds.
 *
 * There is no wrapper around this story giving it a height. The cap is worked out from `100dvh`
 * and how far down the page the table starts, so the table finds the bottom of the window on its
 * own — and `--data-table-reserved` / `--data-table-min-height` on the root are what an
 * application changes if `1rem` of room below it, or a `20rem` floor on a short window, is wrong
 * for its shell.
 *
 * A page size large enough to overflow, because a table that fits the window has nothing to
 * demonstrate.
 */
export const FitHeight: Story = {
  args: {
    withAdjustHeight: true,
    withSearch: true,
    filters,
    paginationOptions: { pageSize: 100 },
  },
}

// ===================== states =====================

/** Nothing yet: skeleton rows, so the table keeps its shape instead of collapsing to a line. */
export const Loading: Story = {
  args: { rows: [], loading: true },
}

/** Rows on screen and a refetch running — they stay, under a spinner, rather than flashing away. */
export const Refetching: Story = {
  args: { loading: true },
}

export const Empty: Story = {
  args: { rows: [] },
}

/**
 * A fetch that failed is not an empty table: "No data" is a different statement, and it hides the
 * retry.
 */
export const Failed: Story = {
  args: { rows: [], error: "Could not load orders.", onRetry: fn() },
}

// ===================== everything =====================

/**
 * The five states a table passes through, side by side. Each says what happened and what to do:
 *
 * - **First load** — text-height skeletons of varying widths, aligned like their columns;
 * - **Refetch** — the rows stay readable, dimmed, under a thin bar running beneath the header;
 * - **No match for the filters** — and a Clear filters button;
 * - **Nothing yet** — a different state, with no way out to offer;
 * - **Request failed** — the server's message, that the filters were kept, and Try again.
 */
export const States: Story = {
  render: () => {
    const few = rows.slice(0, 3)
    const small: DataTableColumn<Order>[] = [
      { id: "reference", label: "Reference", defaultWidth: 160 },
      { id: "total", label: "Total", type: "number", defaultWidth: 120 },
    ]
    const base = {
      columns: small,
      withPagination: false,
      withColumnsVisibility: false,
    } satisfies Partial<DataTableProps<Order>>

    const cases: [string, React.ReactNode][] = [
      [
        "First load",
        <DataTable<Order>
          {...base}
          rows={[]}
          loading
          plainTableProps={{ placeholderRows: 3 }}
        />,
      ],
      [
        "Refetch — rows stay readable",
        <DataTable<Order> {...base} rows={few} loading />,
      ],
      [
        "No match for the filters",
        <DataTable<Order>
          {...base}
          rows={few}
          filters={[{ field: "reference", label: "Reference" }]}
          filtering={{ reference: "nothing-matches" }}
          onFilteringChange={fn()}
        />,
      ],
      ["Nothing yet", <DataTable<Order> {...base} rows={[]} />],
      [
        "Request failed",
        <DataTable<Order>
          {...base}
          rows={[]}
          error="The server did not answer in time (504)."
          onRetry={fn()}
          filters={[{ field: "reference", label: "Reference" }]}
          filtering={{ reference: "SO" }}
          onFilteringChange={fn()}
        />,
      ],
    ]

    return (
      <div className={sb.states}>
        {cases.map(([label, table]) => (
          <div key={label}>
            <div className={sb.stateLabel}>{label}</div>
            {table}
          </div>
        ))}
      </div>
    )
  },
}

/**
 * The whole component, as a screen would use it.
 *
 * This is the story to read first, and the one that stands in for the old grid's preview page.
 */
export const Everything: Story = {
  args: {
    id: "storybook-orders-everything",
    withSelection: true,
    withSearch: true,
    withColumnReorder: true,
    withColumnPinning: true,
    filters,
    searchOptions: {
      searchableFields: [
        { field: "reference", label: "Reference" },
        { field: "customer", label: "Customer" },
      ],
    },
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
    onStateChange: fn(),
  },
}

// ===================== outside the table =====================

/**
 * A live snapshot of one table's state, read by `id` — the read half of `tableApi`, subscribed
 * rather than polled.
 */
function TableSnapshotPanel({ id }: { id: string }) {
  const [snapshot, setSnapshot] = React.useState<TableSnapshot>(
    () => tableApi.getSnapshot(id) ?? {}
  )

  React.useEffect(() => tableApi.subscribe(id, setSnapshot), [id])

  return <pre className={sb.muted}>{JSON.stringify(snapshot, null, 2)}</pre>
}

/**
 * Reaching a mounted table from a page that only knows its `id` — a toolbar in another branch of
 * the tree, an app-level keyboard shortcut, a "reset this view" button that lives beside the
 * table rather than inside it. Everything that can go through props should; `tableApi` is what is
 * left for the cases that cannot, mirroring `table.setSort(id, …)` / `table.getSelectedRows(id)`
 * from the old grid's own preview page.
 *
 * The buttons below sit in a plain `<div>`, entirely outside the `<DataTable>` they control.
 */
export const ControlledFromOutside: Story = {
  render: (args) => (
    <div className={sb.col}>
      <div className={sb.row}>
        <Button
          size="sm"
          onClick={() =>
            tableApi.setSort("storybook-outside-orders", {
              columnId: "total",
              direction: "desc",
            })
          }
        >
          Sort by total, descending
        </Button>
        <Button
          size="sm"
          onClick={() => tableApi.resetSort("storybook-outside-orders")}
        >
          Clear sort
        </Button>
        <Button
          size="sm"
          onClick={() => tableApi.setPageSize("storybook-outside-orders", 5)}
        >
          Set page size to 5
        </Button>
        <Button
          size="sm"
          onClick={() => tableApi.setPage("storybook-outside-orders", 3)}
        >
          Go to page 3
        </Button>
        <Button
          size="sm"
          onClick={() =>
            tableApi.setHiddenColumns("storybook-outside-orders", [
              "warehouse",
              "placedAt",
            ])
          }
        >
          Hide Warehouse + Placed
        </Button>
        <Button
          size="sm"
          onClick={() =>
            tableApi.setHiddenColumns("storybook-outside-orders", [])
          }
        >
          Show every column
        </Button>
        <Button
          size="sm"
          onClick={() =>
            tableApi.setSelectedIds("storybook-outside-orders", ["1", "2", "3"])
          }
        >
          Select rows 1–3
        </Button>
        <Button
          size="sm"
          onClick={() => tableApi.deselectAll("storybook-outside-orders")}
        >
          Deselect all
        </Button>
      </div>

      <DataTable<Order> {...args} id="storybook-outside-orders" />

      <TableSnapshotPanel id="storybook-outside-orders" />
    </div>
  ),
  args: { withSelection: true },
}

// ===================== form =====================
//
// The same trick as `PlainTable`'s `WithInlineForm`, but sortable: `DataTable` can reorder rows
// client-side, so the rows handed to it have to reflect what the user is currently typing rather
// than what they started with — otherwise sorting by Qty would sort yesterday's numbers. This is
// what `sortableRows` did in the legacy grid's `FormWithDataTable` preview; here it is one
// `useWatch` over the whole array, merged back onto the fixture rows on every render.

type OrderLine = { id: string; sku: string; qty: number; warehouse: string }

const WAREHOUSE_NAMES = ["Warsaw", "Kraków", "Gdańsk"]
const WAREHOUSE_OPTIONS = WAREHOUSE_NAMES.map((warehouse) => ({
  value: warehouse,
  label: warehouse,
}))

const orderLines: OrderLine[] = Array.from({ length: 18 }, (_, index) => ({
  id: String(index + 1),
  sku: `WID-${String(index + 1).padStart(3, "0")}`,
  qty: index % 5,
  warehouse: WAREHOUSE_NAMES[index % WAREHOUSE_NAMES.length]!,
}))

/**
 * `PlainTableCellProps.rowIndex` is a position in whatever page is currently on screen, not a
 * stable identity — sorting and paging both reshuffle it. Binding a field to it directly would
 * make row 1 of every page write into `items.0`, clobbering row 1's real values. This maps back
 * to each row's place in `items`, which never moves.
 */
const ITEM_INDEX_BY_ID = new Map(
  orderLines.map((line, index) => [line.id, index])
)

function itemPath<TKey extends "sku" | "qty" | "warehouse">(
  row: OrderLine,
  key: TKey
) {
  const index = ITEM_INDEX_BY_ID.get(row.id)
  return `items.${index}.${key}` as `items.${number}.${TKey}`
}

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

function SkuCell({ row }: PlainTableCellProps<OrderLine>) {
  return <CellField name={itemPath(row, "sku")} label="SKU" />
}

function QtyCell({ row }: PlainTableCellProps<OrderLine>) {
  // Scoped to this one path — no need to watch the whole array just to color one badge.
  const path = itemPath(row, "qty")
  const qty = useWatch<OrderLinesValues>({ name: path }) as number | undefined

  return (
    <div className={sb.row}>
      <CellField name={path} label="Qty" type="number" min={0} />
      <ToneBadge tone={qtyBadgeVariant(qty ?? 0)}>{qty ?? 0}</ToneBadge>
    </div>
  )
}

function WarehouseCell({ row }: PlainTableCellProps<OrderLine>) {
  return (
    <CellField
      name={itemPath(row, "warehouse")}
      label="Warehouse"
      type="select"
      options={WAREHOUSE_OPTIONS}
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
  {
    id: "qty",
    label: "Qty",
    field: "qty",
    template: QtyCell,
    isSortable: true,
  },
  {
    id: "warehouse",
    label: "Warehouse",
    field: "warehouse",
    template: WarehouseCell,
    isSortable: true,
  },
]

/**
 * Reads the whole `items` array live and merges it onto the fixture rows before handing them to
 * `DataTable` — the one extra step `PlainTable`'s version does not need, because only here can the
 * user ask the table to reorder what they are still typing.
 */
function InlineFormDataTable() {
  const watchedItems = useWatch<OrderLinesValues, "items">({ name: "items" })

  const rows = orderLines.map((line, index) => ({
    ...line,
    ...watchedItems?.[index],
  }))

  return (
    <DataTable<OrderLine>
      columns={orderLineColumns}
      rows={rows}
      withPagination
      paginationOptions={{ pageSize: 6 }}
    />
  )
}

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
        <InlineFormDataTable />
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

/** Sort by Qty, then edit the top row's counter past the next row's value — it moves. */
export const WithInlineForm: Story = {
  render: () => <WithInlineFormStory />,
}
