import type * as React from "react"

import type { FormOption } from "@toth/form"
import { cn } from "@toth/ui/lib/utils"

import { useTableLocale } from "../../hooks/use-table-locale"
import { Button } from "../../internal/button"
import { Icon } from "../../internal/icon"
import type { TableMessages } from "../../lib/messages"
import type {
  DataTableFilter,
  FilterEnvelope,
  FilteringState,
  FilterValue,
} from "../../lib/filter-types"
import { formatNumber as formatLocaleNumber } from "../../lib/format"
import {
  formatDateValue,
  type DateFormatSettings,
} from "../../lib/format-cell-value"
import { getSearchValue, SEARCH_KEY } from "../../lib/search-filtering"

// The row of chips under the toolbar: what the table is narrowed by right now, and a way to undo
// each part of it without opening the panel it was set in.
//
// It exists because a filter panel behind a popover hides its own state: a user who navigates back
// to a pre-filtered table otherwise sees fewer rows than they expect with nothing on screen saying
// why. Each chip names one narrowing and removes it.
//
// A quiet band of its own, under the toolbar: the page's ground colour, a hairline above, a
// "Filtered by" lead-in and quiet outlined chips. Not primary badges: the narrowing is context for
// the rows, not the news.

function unwrap(stored: FilterValue): unknown {
  if (
    stored !== null &&
    typeof stored === "object" &&
    !Array.isArray(stored) &&
    "operator" in stored
  ) {
    return (stored as FilterEnvelope).value
  }

  return stored
}

/** The label an option carries, so a chip reads "Status: Active" rather than "Status: 2". */
function optionLabel(
  options: readonly FormOption[] | undefined,
  value: string
): React.ReactNode {
  return options?.find((option) => option.value === value)?.label ?? value
}

/**
 * A chip always says the DAY, never the hour, even for a datetime filter: a chip is read at a
 * glance. `formatDateValue` is shared with the typed columns, so a chip and the cells it narrowed
 * agree on what a date looks like in this app.
 */
function formatDate(value: unknown, settings: DateFormatSettings): string {
  return value === "" || value == null
    ? ""
    : formatDateValue(value, settings, "date")
}

/** A range as one phrase, open at either end when only one bound is set. */
function formatRange(
  value: unknown,
  format: (part: unknown) => string,
  messages: TableMessages["activeFilters"]
): string {
  const { from, to } = (value ?? {}) as { from?: unknown; to?: unknown }
  const start = format(from)
  const end = format(to)

  if (start && end) return messages.range(start, end)
  if (start) return messages.from(start)
  if (end) return messages.to(end)

  return ""
}

/** One chip per value, so a multi-select of three can be undone one option at a time. */
interface Chip {
  /** The filtering key this chip belongs to. */
  field: string
  label: React.ReactNode
  value: React.ReactNode
  /** For a multi-value filter, the single value this chip stands for. */
  item?: string
}

// Switched on `filter.type` rather than on a type read out of it first: the switch is what narrows
// the union, and a narrowed `filter` is what makes `filter.options` reachable in the two branches
// that have options and unreachable in the ones that do not.
interface ChipContext {
  settings: DateFormatSettings
  messages: TableMessages["activeFilters"]
}

function chipsFor(
  filter: DataTableFilter,
  stored: FilterValue,
  { settings, messages }: ChipContext
): Chip[] {
  const value = unwrap(stored)
  const base = { field: filter.field, label: filter.label ?? filter.field }
  const asItems = () => (Array.isArray(value) ? (value as string[]) : [])

  switch (filter.type) {
    case "select":
      return [{ ...base, value: optionLabel(filter.options, String(value)) }]

    case "multi-select":
      return asItems().map((item) => ({
        ...base,
        item,
        value: optionLabel(filter.options, item),
      }))

    case "tags":
      // Tags are what the user typed, so there is no option list to look a label up in.
      return asItems().map((item) => ({ ...base, item, value: item }))

    case "number": {
      const formatNumber = (part: unknown) =>
        typeof part === "number" && Number.isFinite(part)
          ? formatLocaleNumber(part, undefined, settings.locale)
          : ""
      return [{ ...base, value: formatRange(value, formatNumber, messages) }]
    }

    case "date":
    case "datetime":
      return [
        {
          ...base,
          value: formatRange(
            value,
            (part) => formatDate(part, settings),
            messages
          ),
        },
      ]

    default:
      return [{ ...base, value: String(value) }]
  }
}

export interface DataTableActiveFiltersProps {
  filters: readonly DataTableFilter[]
  filtering: FilteringState
  /** Removes one filter entirely. */
  onClearFilter: (field: string) => void
  /**
   * Replaces one filter's value — how a single option leaves a multi-value filter while its
   * siblings stay.
   */
  onSetFilter: (field: string, value: FilterValue | undefined) => void
  /** Clears everything, the search term included. */
  onClearAll: () => void
  /**
   * How wide the table is. At `sm` the chips run in one line that scrolls sideways, without the
   * "Filtered by" lead-in, and Clear all stays pinned at its end.
   */
  size?: "sm" | "md" | "lg"
  className?: string
}

function DataTableActiveFilters({
  filters,
  filtering,
  onClearFilter,
  onSetFilter,
  onClearAll,
  size,
  className,
}: DataTableActiveFiltersProps) {
  const settings = useTableLocale()
  const messages = settings.messages.activeFilters
  const chips: Chip[] = []

  for (const filter of filters) {
    const stored = filtering[filter.field]

    if (stored === undefined) continue

    chips.push(
      ...chipsFor(filter, stored as FilterValue, { settings, messages }).filter(
        (chip) => chip.value !== ""
      )
    )
  }

  const term = getSearchValue(filtering)

  if (term !== "") {
    chips.push({ field: SEARCH_KEY, label: messages.search, value: term })
  }

  if (chips.length === 0) {
    return null
  }

  const removeChip = (chip: Chip) => {
    if (chip.item === undefined) {
      onClearFilter(chip.field)
      return
    }

    // One value out of several: the rest of the filter stays, and only an emptied one is
    // dropped altogether.
    const current = unwrap(filtering[chip.field] as FilterValue)
    const rest = (Array.isArray(current) ? (current as string[]) : []).filter(
      (item) => item !== chip.item
    )
    const stored = filtering[chip.field] as FilterValue
    const wasEnveloped =
      stored !== null &&
      typeof stored === "object" &&
      !Array.isArray(stored) &&
      "operator" in stored

    if (rest.length === 0) {
      onClearFilter(chip.field)
      return
    }

    // Put back in the shape it came in: the envelope is the server's contract, and a tags
    // filter that loses its `{ operator: 'in' }` on the way out stops matching.
    onSetFilter(
      chip.field,
      wasEnveloped ? { ...(stored as FilterEnvelope), value: rest } : rest
    )
  }

  return (
    <div
      data-slot="active-filters"
      data-size={size}
      // At `sm` the chips run in one line that scrolls sideways, without the lead-in, and Clear
      // all stays pinned at its end.
      className={cn(
        "group/filters flex flex-wrap items-center gap-1 border-t bg-background px-4 py-1.5",
        "data-[size=sm]:[scrollbar-width:none] data-[size=sm]:flex-nowrap data-[size=sm]:overflow-x-auto data-[size=sm]:overscroll-x-contain data-[size=sm]:[&::-webkit-scrollbar]:hidden",
        className
      )}
      // A live region: removing a chip changes what the table shows, and the change is
      // announced rather than only seen.
      aria-live="polite"
    >
      <span className="mr-1 text-xs font-medium whitespace-nowrap text-muted-foreground group-data-[size=sm]/filters:hidden">
        {messages.lead}
      </span>

      {chips.map((chip) => (
        <span
          key={`${chip.field}:${chip.item ?? ""}`}
          data-slot="active-filters-chip"
          className="inline-flex h-7 max-w-64 shrink-0 items-center gap-1 rounded-full border bg-background pr-1 pl-2.5 text-xs whitespace-nowrap"
        >
          <span className="shrink-0 text-muted-foreground">{chip.label}</span>
          <span className="truncate font-medium">{chip.value}</span>
          <button
            type="button"
            className="relative inline-flex shrink-0 cursor-pointer rounded-full p-1 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-2.5"
            // One value of several names the value too — three "Remove filter Status"
            // buttons in a row are three buttons nobody can tell apart.
            aria-label={
              chip.item === undefined
                ? messages.remove(String(chip.label))
                : messages.removeValue(
                    String(chip.label),
                    typeof chip.value === "string" ? chip.value : chip.item
                  )
            }
            onClick={() => removeChip(chip)}
          >
            <Icon icon="x" className="size-3.5" />
          </button>
        </span>
      ))}

      {/* Only worth offering once there is more than one thing to clear. */}
      {chips.length > 1 ? (
        <Button
          variant="link"
          size="sm"
          data-clear-all=""
          className="whitespace-nowrap group-data-[size=sm]/filters:sticky group-data-[size=sm]/filters:-right-4 group-data-[size=sm]/filters:-mr-4 group-data-[size=sm]/filters:ml-auto group-data-[size=sm]/filters:shrink-0 group-data-[size=sm]/filters:bg-background group-data-[size=sm]/filters:pr-4 group-data-[size=sm]/filters:pl-5 group-data-[size=sm]/filters:shadow-[-0.75rem_0_0.5rem_-0.25rem_var(--color-background)]"
          onClick={onClearAll}
        >
          {messages.clearAll}
        </Button>
      ) : null}
    </div>
  )
}

export { DataTableActiveFilters }
