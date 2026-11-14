import type { Meta, StoryObj } from "@storybook/react-vite"
import type {
  DataTableColumn,
  DataTableDensity,
} from "../data-table/data-table.types"
import * as React from "react"
import { fn } from "storybook/test"

import { DataTableViewPanel } from "./view-panel"

const initial: DataTableColumn<unknown>[] = [
  { id: "reference", label: "Reference" },
  { id: "customer", label: "Customer" },
  { id: "channel", label: "Channel", isHidden: true },
  { id: "warehouse", label: "Warehouse" },
  { id: "total", label: "Total" },
]

const meta = {
  title: "Table/Parts/ViewPanel",
  component: DataTableViewPanel,
  tags: ["autodocs"],
  args: { columns: initial, onToggleColumn: fn() },
} satisfies Meta<typeof DataTableViewPanel>

export default meta
type Story = StoryObj<typeof meta>

/**
 * View options on their own, as the table's sliders button opens them: density, column dividers,
 * the column list with its up and down arrows, and the way back to the table's defaults.
 */
export const Default: Story = {
  render: () => {
    function Demo() {
      const [density, setDensity] = React.useState<DataTableDensity>("default")
      const [dividers, setDividers] = React.useState(false)
      const [columns, setColumns] = React.useState(initial)

      return (
        <div className="sb-surface">
          <DataTableViewPanel
            density={density}
            onDensityChange={setDensity}
            columnDividers={dividers}
            onColumnDividersChange={setDividers}
            columns={columns}
            onToggleColumn={(id) =>
              setColumns((current) =>
                current.map((column) =>
                  column.id === id
                    ? { ...column, isHidden: !column.isHidden }
                    : column
                )
              )
            }
            withReorder
            onReorder={(order) =>
              setColumns((current) =>
                order.map((id) => current.find((column) => column.id === id)!)
              )
            }
            getPinSide={(id) => (id === "reference" ? "left" : false)}
            onReset={() => {
              setDensity("default")
              setDividers(false)
              setColumns(initial)
            }}
          />
        </div>
      )
    }

    return <Demo />
  },
}
