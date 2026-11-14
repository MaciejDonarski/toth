import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@toth/ui/components/dropdown-menu"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Checkbox } from "../../internal/checkbox"
import { Icon } from "../../internal/icon"
import type { SelectionStore } from "../data-table/hooks/use-selection"
import type { PlainTableCellProps } from "../plain-table/types"

// The two cells the selection column is made of: the box in each row, and the box plus menu in the
// header.
//
// Both read the selection through context rather than through props. That is what lets the
// synthetic selection column be a module-level CONSTANT: a column array rebuilt on every render
// would invalidate the pinning, ordering and width memos below it on every render, and the table
// would recompute its whole layout every time a single checkbox moved.

export interface SelectionRowContextValue {
  /**
   * The id of a row, given the row and its index.
   *
   * `unknown` because the context cannot be generic over the row type and still be read by a
   * module-level component. The function put in here is the table's own typed `getRowId`, and
   * every caller passes it a row that came out of the same table, so the looseness never escapes.
   */
  rowId: (row: unknown, index: number) => React.Key
  /** What a row is called in its checkbox's accessible name. Absent, the row's id is used. */
  getRowLabel?: (row: unknown) => string
  /** Each checkbox subscribes to its own row here, rather than to the whole selection. */
  store: SelectionStore
  isRowSelectable: (rowId: React.Key) => boolean
  toggleRow: (rowId: React.Key) => void
}

export interface SelectionHeaderContextValue {
  /** How many rows are selected — every matching row, less the unticked, in `'all'` mode. */
  selectedCount?: number
  /** How many rows match — what "Select all N" would select. */
  totalCount?: number
  /**
   * Whether "Select all N" is on offer: client-side, or against a server that accepts an
   * "all matching" selection (`selectionOptions.selectAllMatching`).
   */
  canSelectAll: boolean
  isAllSelected: boolean
  isPageSelected: boolean
  /** Some of the rows on this page are selected, but not all of them. */
  isPagePartiallySelected: boolean
  selectAll: () => void
  deselectAll: () => void
  selectPage: () => void
  deselectPage: () => void
}

// Two contexts, because they change at very different rates. The row half is stable for the life
// of the table — its members are a store and functions that do not change with the selection — so
// ticking one box re-renders the one checkbox that store says has changed. The header half changes
// on every tick, and has exactly one consumer.
const SelectionRowContext =
  React.createContext<SelectionRowContextValue | null>(null)
const SelectionHeaderContext =
  React.createContext<SelectionHeaderContextValue | null>(null)

/** Makes the selection available to the cells in the selection column. */
function DataTableSelectionProvider({
  row,
  header,
  children,
}: {
  row: SelectionRowContextValue
  header: SelectionHeaderContextValue
  children: React.ReactNode
}) {
  return (
    <SelectionRowContext value={row}>
      <SelectionHeaderContext value={header}>{children}</SelectionHeaderContext>
    </SelectionRowContext>
  )
}

// Stands in when there is no provider, so the hook below is still called unconditionally.
const NO_STORE: SelectionStore = {
  subscribe: () => () => {},
  getSnapshot: () => new Set(),
}

/** One row's checkbox. */
function DataTableSelectionCell<TRow>({
  row,
  rowIndex,
}: PlainTableCellProps<TRow>) {
  const selection = React.use(SelectionRowContext)
  const messages = useTableMessages()
  const id = selection?.rowId(row, rowIndex)
  const store = selection?.store ?? NO_STORE

  // A boolean snapshot, so this cell re-renders only when its own row flips.
  const checked = React.useSyncExternalStore(
    store.subscribe,
    () => id !== undefined && store.getSnapshot().has(id)
  )

  if (!selection || id === undefined) {
    return null
  }

  const selectable = selection.isRowSelectable(id)
  const name = selection.getRowLabel
    ? selection.getRowLabel(row)
    : messages.selection.row(String(id))

  return (
    <Checkbox
      checked={checked}
      disabled={!selectable}
      // The row is what identifies the checkbox; the header says what the column is.
      aria-label={messages.selection.selectRow(name)}
      className="mx-auto"
      onCheckedChange={() => selection.toggleRow(id)}
    />
  )
}

/**
 * The header's checkbox, and the menu beside it.
 *
 * The box always does the unambiguous thing: it selects or clears THIS PAGE, which is what a header
 * checkbox in a paginated table is understood to do. Its state has three values — clear, ticked
 * (this whole page) and mixed (something is selected, but not this whole page — including a
 * selection that lies entirely on other pages, which is the only hint the user has that it exists).
 *
 * The chevron opens the four explicit choices, headed by a count of what is selected out of how
 * many. Choices that would change nothing are disabled rather than removed, so the menu never
 * reshuffles under the pointer; "Select all N" is left out only where it cannot be honoured at all.
 */
function DataTableSelectionHeaderCell() {
  const selection = React.use(SelectionHeaderContext)
  const messages = useTableMessages()

  if (!selection) {
    return null
  }

  const selectedCount = selection.selectedCount ?? 0
  const pageHasSelection =
    selection.isPageSelected || selection.isPagePartiallySelected

  const box = (
    <Checkbox
      checked={selection.isPageSelected}
      indeterminate={!selection.isPageSelected && selectedCount > 0}
      aria-label={
        selection.isPageSelected
          ? messages.selection.clearPage
          : messages.selection.selectPage
      }
      onCheckedChange={() =>
        selection.isPageSelected
          ? selection.deselectPage()
          : selection.selectPage()
      }
    />
  )

  return (
    <div className="inline-flex items-center gap-0.5 align-middle">
      {box}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              data-slot="selection-header-button"
              className="relative inline-flex h-6 w-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1.5 pointer-coarse:after:-inset-y-2.5"
              aria-label={messages.selection.options}
            >
              <Icon icon="chevron-down" className="size-3.5" />
            </button>
          }
        />
        <DropdownMenuContent className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {selectedCount > 0
                ? selection.totalCount !== undefined
                  ? messages.selection.selectedOf(
                      selectedCount,
                      selection.totalCount
                    )
                  : messages.selection.selected(selectedCount)
                : messages.selection.nothingSelected}
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={selection.isPageSelected}
              onClick={selection.selectPage}
            >
              <Icon icon="check" />
              {messages.selection.selectCurrentPage}
            </DropdownMenuItem>
            {selection.canSelectAll ? (
              <DropdownMenuItem
                disabled={selection.isAllSelected}
                onClick={selection.selectAll}
              >
                <Icon icon="list-todo" />
                {selection.totalCount !== undefined
                  ? messages.selection.selectAllCount(selection.totalCount)
                  : messages.selection.selectAll}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={!pageHasSelection}
              onClick={selection.deselectPage}
            >
              <Icon icon="x" />
              {messages.selection.deselectCurrentPage}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={selectedCount === 0}
              onClick={selection.deselectAll}
            >
              <Icon icon="x" />
              {messages.selection.deselectAll}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** The header label of the selection column, as `PlainTableColumn.label` takes it. */
function selectionHeaderLabel(): React.ReactNode {
  return <DataTableSelectionHeaderCell />
}

export {
  DataTableSelectionCell,
  DataTableSelectionHeaderCell,
  DataTableSelectionProvider,
  selectionHeaderLabel,
}
