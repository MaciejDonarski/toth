import * as React from "react"

import { Checkbox } from "@toth/ui/components/checkbox"
import { Switch } from "@toth/ui/components/switch"
import { ToggleGroup, ToggleGroupItem } from "@toth/ui/components/toggle-group"
import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Button } from "../../internal/button"
import { IconButton } from "../../internal/icon-button"
import type { ColumnPinSide } from "../../lib/table-state"
import type {
  DataTableColumn,
  DataTableDensity,
} from "../data-table/data-table.types"

const SECTION_CLASS = "flex flex-col gap-1"
const TITLE_CLASS = "m-0 px-1 text-xs font-semibold text-muted-foreground"

// View options: how the table is shown, in one panel — row density, lines between columns, how
// often it refreshes (on a server-backed table), which columns are shown and in what order, and
// a way back to how it started.
//
// It replaces the Columns panel. Everything here changes the view and nothing changes the data,
// which is why it is one surface behind one sliders icon rather than a row of toggles in the toolbar.
// Column-by-column actions (sort, pin, hide one column) are in each header's own menu; this is the
// table-wide view of the same settings.

/** What a column is called here — its header text when it has one, its id otherwise. */
function columnName(column: DataTableColumn<unknown>): string {
  const label =
    typeof column.label === "function" ? column.label() : column.label

  return typeof label === "string" && label !== "" ? label : column.id
}

export interface DataTableViewPanelProps<TRow> {
  density?: DataTableDensity
  onDensityChange?: (density: DataTableDensity) => void
  columnDividers?: boolean
  onColumnDividersChange?: (columnDividers: boolean) => void
  /**
   * More sections, drawn between the dividers switch and the column list — the async table's
   * Auto-refresh goes here. Each section draws its own title.
   */
  sections?: React.ReactNode
  /**
   * The columns to offer, in their current order, each carrying whether it is hidden. The table's
   * own selection and actions columns are not among them.
   */
  columns: DataTableColumn<TRow>[]
  onToggleColumn: (columnId: string) => void
  /** Up and down buttons on each row, which emit the whole new order. */
  withReorder?: boolean
  onReorder?: (order: string[]) => void
  /** Notes "· pinned left" beside a pinned column. */
  getPinSide?: (columnId: string) => ColumnPinSide
  /** "Reset to default view". Absent, the link is not drawn. */
  onReset?: () => void
  className?: string
}

function DataTableViewPanel<TRow>({
  density = "default",
  onDensityChange,
  columnDividers = false,
  onColumnDividersChange,
  sections,
  columns,
  onToggleColumn,
  withReorder = false,
  onReorder,
  getPinSide,
  onReset,
  className,
}: DataTableViewPanelProps<TRow>) {
  const messages = useTableMessages()
  const titleId = React.useId()
  const dividersId = React.useId()
  const shown = columns.filter((column) => !column.isHidden).length

  const move = (index: number, step: -1 | 1) => {
    const order = columns.map((column) => column.id)
    const target = index + step

    if (target < 0 || target >= order.length) return

    ;[order[index], order[target]] = [order[target]!, order[index]!]
    onReorder?.(order)
  }

  return (
    <div
      data-slot="view-panel"
      className={cn("flex w-72 max-w-full flex-col gap-2 p-2", className)}
    >
      {onDensityChange ? (
        <section className={SECTION_CLASS}>
          <h3 className={TITLE_CLASS} id={`${titleId}-density`}>
            {messages.view.density}
          </h3>
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-labelledby={`${titleId}-density`}
            value={[density]}
            onValueChange={(value) => {
              // A segmented control always holds a choice: clicking the pressed one
              // reports an empty value, which is not a density.
              const next = value[0] as DataTableDensity | undefined
              if (next) onDensityChange(next)
            }}
          >
            <ToggleGroupItem value="default">
              {messages.view.comfortable}
            </ToggleGroupItem>
            <ToggleGroupItem value="compact">
              {messages.view.compact}
            </ToggleGroupItem>
          </ToggleGroup>
        </section>
      ) : null}

      {onColumnDividersChange ? (
        <label
          className="flex min-h-10 cursor-pointer items-center justify-between gap-4 px-1 text-sm"
          htmlFor={dividersId}
        >
          <span>
            {messages.view.dividers}
            <small className="block text-xs text-muted-foreground">
              {messages.view.dividersHint}
            </small>
          </span>
          <Switch
            id={dividersId}
            checked={columnDividers}
            onCheckedChange={(checked) => onColumnDividersChange(checked)}
          />
        </label>
      ) : null}

      {sections}

      <div className="-mx-2 my-1 h-px bg-border" role="separator" />

      <section className={SECTION_CLASS}>
        <h3 className={TITLE_CLASS}>
          {messages.view.columns}{" "}
          <span className="font-normal">
            {messages.view.shown(shown, columns.length)}
          </span>
        </h3>
        <ul className="m-0 flex max-h-[50vh] list-none flex-col overflow-y-auto p-0">
          {columns.map((column, index) => {
            const name = columnName(column as DataTableColumn<unknown>)
            const pin = getPinSide?.(column.id)

            return (
              <li
                key={column.id}
                className="group/column flex min-h-10 items-center gap-2 rounded-sm px-1 hover:bg-muted"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={!column.isHidden}
                    onCheckedChange={() => onToggleColumn(column.id)}
                  />
                  <span className="truncate">{name}</span>
                  {pin ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {pin === "left"
                        ? messages.view.pinnedLeft
                        : messages.view.pinnedRight}
                    </span>
                  ) : null}
                </label>
                {withReorder ? (
                  <span className="inline-flex opacity-0 transition-opacity group-focus-within/column:opacity-100 group-hover/column:opacity-100 [@media(hover:none)]:opacity-100">
                    <IconButton
                      icon="chevron-up"
                      variant="ghost"
                      size="icon-sm"
                      label={messages.view.moveUp(name)}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    />
                    <IconButton
                      icon="chevron-down"
                      variant="ghost"
                      size="icon-sm"
                      label={messages.view.moveDown(name)}
                      disabled={index === columns.length - 1}
                      onClick={() => move(index, 1)}
                    />
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      {onReset ? (
        <Button
          variant="link"
          size="sm"
          className="self-start"
          onClick={onReset}
        >
          {messages.view.reset}
        </Button>
      ) : null}
    </div>
  )
}

/** One more titled section for the panel — what `slots.viewPanelSections` draws its parts with. */
function DataTableViewPanelSection({
  title,
  children,
}: {
  title: React.ReactNode
  children: React.ReactNode
}) {
  const id = React.useId()

  return (
    <section className={SECTION_CLASS} aria-labelledby={id}>
      <h3 className={TITLE_CLASS} id={id}>
        {title}
      </h3>
      {children}
    </section>
  )
}

export { DataTableViewPanel, DataTableViewPanelSection }
