import type {
  Announcements,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import * as React from "react"

import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Icon } from "../../internal/icon"
import { IconButton } from "../../internal/icon-button"
import { Tooltip } from "../../internal/tooltip"
import type { TableMessages } from "../../lib/messages"
import type { ColumnPinSide } from "../../lib/table-state"
import type { DataTableColumn } from "../data-table/data-table.types"

// The Columns panel: which columns are shown, in what order, and which are frozen to an edge.
//
// The three concerns live in one panel because they are one decision — "what do I want to see, and
// where" — and splitting them across three menus makes a user open three things to lay out a table
// once.
//
// Reordering is dragging, and dragging alone is not enough: `@dnd-kit`'s `KeyboardSensor` is wired
// so the same list can be reordered from the keyboard, which is the only reason a drag-and-drop
// dependency is defensible in a component library at all.

/** Where a column sits in the panel. The order of this list is the order of the sections. */
const SECTIONS = [
  { side: "left" as const, title: "pinnedLeft" },
  { side: false as const, title: "title" },
  { side: "right" as const, title: "pinnedRight" },
] satisfies { side: ColumnPinSide; title: keyof TableMessages["columns"] }[]

/**
 * What a column is called, for everything this panel says about it — the row, the controls'
 * accessible names and the drag announcements alike. The header's text when it has one, the id
 * only when it does not: an id is the table's name for a column, not the user's.
 */
function columnName(column: DataTableColumn<unknown>): string {
  const label =
    typeof column.label === "function" ? column.label() : column.label

  return typeof label === "string" && label !== "" ? label : column.id
}

interface ColumnRowProps {
  column: DataTableColumn<unknown>
  side: ColumnPinSide
  withReorder: boolean
  withPinning: boolean
  onToggleColumn: (columnId: string) => void
  onPin?: (columnId: string, side: ColumnPinSide) => void
}

function ColumnRow({
  column,
  side,
  withReorder,
  withPinning,
  onToggleColumn,
  onPin,
}: ColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: !withReorder,
  })

  const name = columnName(column)
  const messages = useTableMessages()

  return (
    <li
      ref={setNodeRef}
      data-dragging={isDragging || undefined}
      className="group/row flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-muted data-dragging:z-1 data-dragging:bg-background data-dragging:shadow-md"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {withReorder ? (
        <Tooltip
          trigger={
            <span
              {...attributes}
              {...listeners}
              className="flex shrink-0 cursor-grab touch-none items-center rounded-sm py-2 text-muted-foreground outline-none group-data-dragging/row:cursor-grabbing hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={messages.columns.reorder(name)}
            >
              <Icon icon="grip-vertical" className="size-4" />
            </span>
          }
        >
          {messages.columns.reorderTooltip}
        </Tooltip>
      ) : null}

      <span
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 overflow-hidden",
          column.isHidden && "text-muted-foreground"
        )}
      >
        <span className="truncate text-sm">{name}</span>
        <IconButton
          icon={column.isHidden ? "eye-off" : "eye"}
          variant="ghost"
          label={
            column.isHidden
              ? messages.columns.show(name)
              : messages.columns.hide(name)
          }
          onClick={() => onToggleColumn(column.id)}
        />
      </span>

      {withPinning ? (
        <span className="flex shrink-0 items-center opacity-10 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100 [@media(hover:none)]:opacity-100">
          <IconButton
            icon="panel-left-dashed"
            size="icon"
            variant={side === "left" ? "secondary" : "ghost"}
            // A pin toggles: clicking the edge a column is already on unpins it, which
            // is the only way back without a third control.
            label={
              side === "left"
                ? messages.columns.unpin(name)
                : messages.columns.pinLeft(name)
            }
            onClick={() => onPin?.(column.id, side === "left" ? false : "left")}
          />
          <IconButton
            icon="panel-right-dashed"
            size="icon"
            variant={side === "right" ? "secondary" : "ghost"}
            label={
              side === "right"
                ? messages.columns.unpin(name)
                : messages.columns.pinRight(name)
            }
            onClick={() =>
              onPin?.(column.id, side === "right" ? false : "right")
            }
          />
        </span>
      ) : null}
    </li>
  )
}

/** @deprecated See `DataTableColumnsPanel`. */
export interface DataTableColumnsPanelProps<TRow> {
  /**
   * The columns to offer, in their current order, each carrying whether it is hidden.
   *
   * The table's synthetic columns are not among them: a selection checkbox or a row menu is part
   * of the table rather than of the data, and offering to hide one is offering to break it.
   */
  columns: DataTableColumn<TRow>[]
  onToggleColumn: (columnId: string) => void
  withReorder?: boolean
  /** The full order across every section, emitted whenever a drag lands. */
  onReorder?: (order: string[]) => void
  withPinning?: boolean
  getPinSide?: (columnId: string) => ColumnPinSide
  onPin?: (columnId: string, side: ColumnPinSide) => void
  className?: string
}

/**
 * @deprecated The table draws `DataTableViewPanel` (View options) instead, which holds the column
 * list alongside density, dividers and auto-refresh; pinning moved to each column's header menu.
 * Kept, unchanged, for a caller who renders it themselves — removed in the next major.
 */
function DataTableColumnsPanel<TRow>({
  columns,
  onToggleColumn,
  withReorder = false,
  onReorder,
  withPinning = false,
  getPinSide,
  onPin,
  className,
}: DataTableColumnsPanelProps<TRow>) {
  const messages = useTableMessages()
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so clicking a checkbox in the row is
    // still a click and not a drag of nothing.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sideOf = React.useCallback(
    (columnId: string): ColumnPinSide =>
      withPinning ? (getPinSide?.(columnId) ?? false) : false,
    [withPinning, getPinSide]
  )

  // Grouped by section while keeping the order within each one.
  const grouped = React.useMemo(() => {
    const map = new Map<ColumnPinSide, DataTableColumn<TRow>[]>([
      ["left", []],
      [false, []],
      ["right", []],
    ])

    for (const column of columns) {
      map.get(sideOf(column.id))?.push(column)
    }

    return map
  }, [columns, sideOf])

  // What the live region says while a column is being moved. dnd-kit's defaults read out the
  // sortable ids — "Draggable item customer_name was moved over droppable area sku" — which is the
  // table's vocabulary, not the user's. These use the header text and the position in the section,
  // the two things a user can check against what they see.
  const announcements = React.useMemo<Announcements>(() => {
    const byId = new Map(
      columns.map((column) => [column.id, column as DataTableColumn<unknown>])
    )
    const nameOf = (id: UniqueIdentifier) => {
      const column = byId.get(String(id))
      return column ? columnName(column) : String(id)
    }
    const positionOf = (id: UniqueIdentifier) => {
      const section = grouped.get(sideOf(String(id))) ?? []
      const index = section.findIndex((column) => column.id === String(id))

      return m.position(index + 1, section.length)
    }
    const m = messages.columns

    return {
      onDragStart: ({ active }) =>
        m.pickedUp(nameOf(active.id), positionOf(active.id)),
      onDragOver: ({ active, over }) =>
        over
          ? m.movedOver(nameOf(active.id), positionOf(over.id))
          : m.outside(nameOf(active.id)),
      onDragEnd: ({ active, over }) =>
        over
          ? m.dropped(nameOf(active.id), positionOf(over.id))
          : m.droppedBack(nameOf(active.id)),
      onDragCancel: ({ active }) =>
        m.cancelled(nameOf(active.id), positionOf(active.id)),
    }
  }, [columns, grouped, sideOf, messages])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const side = sideOf(String(active.id))
    const section = grouped.get(side) ?? []
    const from = section.findIndex((column) => column.id === active.id)
    const to = section.findIndex((column) => column.id === over.id)

    // A drop outside the section it started in: the sections are separate lists, and a column
    // changes section by being pinned rather than by being dragged.
    if (from === -1 || to === -1) return

    const reordered = arrayMove(section, from, to)
    const next = new Map(grouped)
    next.set(side, reordered)

    // The whole order goes out, not the section's: the table orders one flat list of columns,
    // and a section is only how this panel groups them.
    onReorder?.(
      SECTIONS.flatMap(({ side: sectionSide }) =>
        (next.get(sectionSide) ?? []).map((column) => column.id)
      )
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      // Vertical only, and inside the list: a column list is one dimension, and a row that
      // can be dragged out of the panel is a row the user has to go and find.
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      accessibility={{
        announcements,
        // How a keyboard user is told to reorder — read out when a grip takes focus.
        screenReaderInstructions: {
          draggable: messages.columns.dragInstructions,
        },
      }}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-2",
          className
        )}
      >
        {SECTIONS.map(({ side, title }) => {
          const section = grouped.get(side) ?? []

          // An empty pinned section is not drawn — a heading over nothing reads as
          // something missing. The middle section is always drawn, even empty, because
          // its absence would mean every column is pinned and the panel looks broken.
          if (section.length === 0 && side !== false) return null

          return (
            <section key={String(side)} className="flex flex-col gap-1">
              <h3 className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {messages.columns[title]}
              </h3>

              <SortableContext
                items={section.map((column) => column.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {section.map((column) => (
                    <ColumnRow
                      key={column.id}
                      column={column as DataTableColumn<unknown>}
                      side={side}
                      withReorder={withReorder}
                      withPinning={withPinning}
                      onToggleColumn={onToggleColumn}
                      onPin={onPin}
                    />
                  ))}
                </ul>
              </SortableContext>
            </section>
          )
        })}
      </div>
    </DndContext>
  )
}

export { DataTableColumnsPanel }
