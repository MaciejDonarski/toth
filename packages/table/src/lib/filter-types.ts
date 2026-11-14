import { endOfDay, formatISO, startOfDay } from "date-fns"
import type * as React from "react"

import type { FormItemConfig, FormOption, NumberRangeValue } from "@toth/form"

import { parseDate } from "./format"

// The single place that knows how a filter type maps to a form field, what its empty value looks
// like, how a form value is shaped into the stored `filtering` value and back, and whether a value
// counts as set.
//
// Two conventions meet here and only one of them is ours to choose:
//
//   - The FORM value follows `@toth/form`. A single select is empty at `null`, tags is a
//     `string[]`, a number range is `{ from: null, to: null }`, a date range is `{ from, to }` of
//     `Date`s (empty at `null`). Those are the values the controls actually produce, and
//     second-guessing them is how a filter ends up looking set when it is not.
//   - The STORED value is the server's contract and is reproduced exactly: `select` carries an
//     `{ operator: 'eq', value }` envelope, `tags` an `{ operator: 'in', value: [] }` one,
//     `multi-select` a bare array, ranges `{ from, to }`, text a trimmed string. None of it is
//     negotiable, so none of it is prettied up here.
//
// Everything in this module is pure — no React, no form, no storage — so the mapping can be tested
// on its own and reused by both the client-side predicates and the server payload builder.

/** The filter types a `DataTable` knows how to draw and apply. */
export type DataTableFilterType =
  "text" | "number" | "select" | "multi-select" | "tags" | "date" | "datetime"

/** The `{ operator, value }` wrapper the server expects around a chosen value. */
export interface FilterEnvelope {
  operator: "eq" | "in"
  value: string | string[] | null
}

/** A date range as it is stored and sent: ISO datetimes, `''` for an open end. */
export interface DateRangeValue {
  from: string
  to: string
}

/** A date range as the `date-range` field produces it. */
export interface DateRangeFormValue {
  from?: Date
  to?: Date
}

export type { NumberRangeValue }

/** A value as it is held in the filtering state and sent to the server. */
export type FilterValue =
  string | string[] | FilterEnvelope | NumberRangeValue | DateRangeValue

/** A value as the form control produces and consumes it. */
export type FilterFormValue =
  string | string[] | null | NumberRangeValue | DateRangeFormValue

/**
 * The full-text term, which shares the filtering map with the field filters under a reserved key.
 * The two extra members are the server's, not ours — see `search-filtering.ts`.
 */
export interface SearchEntry {
  fieldType: string
  filterType: string
  value: string
}

/** Everything the table is filtered by: one entry per field, plus at most one search entry. */
export type FilteringState = Record<string, FilterValue | SearchEntry>

// What a filter may pass through to its `FormItem` — placeholder, description, `min`/`step`,
// `dateFormat`, presets… — EXCEPT what someone else already owns: the field's identity and type
// (the filter's own `field` and `type`), and `label` / `options`, which the filter declares itself.
type ItemOf<TType extends string> = Extract<FormItemConfig, { type: TType }>
type PassThrough<TItem> = Partial<
  Omit<TItem, "type" | "name" | "label" | "options">
>

interface FilterBase {
  /** The server field this filter applies to, and its key in the filtering state. May be dotted. */
  field: string
  label?: React.ReactNode
  /** Position in the filter panel, on the shared scale `sortActionsByOrder` uses. */
  order?: number
  /**
   * The field name to send to the server, when it differs from `field`. The state stays keyed by
   * `field` either way, so a rename on the backend never reaches the persisted filter state.
   */
  serverField?: string
  /**
   * Derives the value a client-side filter compares against, when the cell does not hold it
   * directly — a status object whose `code` is what the dropdown offers, say.
   *
   * Client-side only: in `manual` mode the server does the comparing and never sees this.
   */
  getClientValue?: (raw: unknown) => unknown
}

/** A substring match. The default, and what a filter with no `type` is. */
export interface TextFilter extends FilterBase {
  type?: "text"
  defaultValue?: string
  fieldProps?: PassThrough<ItemOf<"text">>
}

/** A `{ from, to }` bound, inclusive at both ends. */
export interface NumberFilter extends FilterBase {
  type: "number"
  defaultValue?: NumberRangeValue
  fieldProps?: PassThrough<ItemOf<"number-range">>
}

/** One of a list. */
export interface SelectFilter extends FilterBase {
  type: "select"
  options: FormOption[]
  defaultValue?: string | null
  fieldProps?: PassThrough<ItemOf<"select">>
}

/** Any of a list. */
export interface MultiSelectFilter extends FilterBase {
  type: "multi-select"
  options: FormOption[]
  defaultValue?: string[]
  fieldProps?: PassThrough<ItemOf<"multiselect">>
}

/** Any of a set the user types in. */
export interface TagsFilter extends FilterBase {
  type: "tags"
  defaultValue?: string[]
  fieldProps?: PassThrough<ItemOf<"tags">>
}

/**
 * A date or datetime range, inclusive: `from` is stored at the start of its day and `to` at the
 * end of its, as ISO datetimes. Presets default to `DATE_RANGE_PRESETS` from `@toth/form`.
 */
export interface DateFilter extends FilterBase {
  type: "date" | "datetime"
  defaultValue?: DateRangeFormValue
  fieldProps?: PassThrough<ItemOf<"date-range">>
}

/**
 * One filter, as a consumer declares it.
 *
 * Filters are a list of their own rather than something read off `columns`: what a table can be
 * filtered by and what it shows are different questions, and the server answers them separately.
 */
export type DataTableFilter =
  | TextFilter
  | NumberFilter
  | SelectFilter
  | MultiSelectFilter
  | TagsFilter
  | DateFilter

/** The empty range both range types start from — a shared constant so identity checks hold. */
const EMPTY_NUMBER_RANGE: NumberRangeValue = { from: null, to: null }

function isRangeType(type: DataTableFilterType): boolean {
  return type === "number" || type === "date" || type === "datetime"
}

/** The type a filter with no `type` has. Spelled once so every branch below agrees. */
export function filterTypeOf(filter: DataTableFilter): DataTableFilterType {
  return filter.type ?? "text"
}

/**
 * What the control shows when nothing is chosen — and what "Reset all" puts back.
 *
 * These are `@toth/form`'s empty values, not zeroes of our own: a single select really is
 * `null` rather than `''`, and giving it `''` would leave the control looking as if an option
 * called "" were selected.
 */
export function getEmptyValue(type: DataTableFilterType): FilterFormValue {
  switch (type) {
    case "select":
    case "date":
    case "datetime":
      return null
    case "multi-select":
    case "tags":
      return []
    case "number":
      return EMPTY_NUMBER_RANGE
    default:
      return ""
  }
}

/** Whether a form value should be dropped rather than applied. */
export function isEmptyValue(
  type: DataTableFilterType,
  value: unknown
): boolean {
  if (value === null || value === undefined || value === "") {
    return true
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (isRangeType(type) && typeof value === "object") {
    const { from, to } = value as { from?: unknown; to?: unknown }
    return (
      (from === null || from === undefined || from === "") &&
      (to === null || to === undefined || to === "")
    )
  }

  return false
}

/** Form value → the envelope the server and the client-side predicates expect. */
export function toFilterValue(
  type: DataTableFilterType,
  value: FilterFormValue
): FilterValue {
  switch (type) {
    case "select":
      return { operator: "eq", value: value as string | null }
    case "tags":
      return { operator: "in", value: value as string[] }
    // A multi-select is sent bare, without an envelope. That asymmetry is the server's; it is
    // reproduced rather than smoothed over, because smoothing it over changes the request.
    case "multi-select":
    case "number":
      return value as FilterValue
    // The control holds `Date`s; the state and the server hold ISO strings, so a stored filter
    // survives JSON. Whole days, inclusive: the end runs to the last moment of its day.
    case "date":
    case "datetime": {
      const { from, to } = (value ?? {}) as DateRangeFormValue
      return {
        from: from ? formatISO(startOfDay(from)) : "",
        to: to ? formatISO(endOfDay(to)) : "",
      }
    }
    default:
      return typeof value === "string" ? value.trim() : (value as FilterValue)
  }
}

/** Stored value → the form value that redraws it, unwrapping the envelope where there is one. */
export function fromFilterValue(
  type: DataTableFilterType,
  stored: unknown
): FilterFormValue {
  if (stored === undefined) {
    return getEmptyValue(type)
  }

  if (type === "date" || type === "datetime") {
    const { from, to } = (stored ?? {}) as Partial<DateRangeValue>
    const range = {
      from: parseDate(from) ?? undefined,
      to: parseDate(to) ?? undefined,
    }
    return range.from || range.to ? range : getEmptyValue(type)
  }

  if (
    stored !== null &&
    typeof stored === "object" &&
    !Array.isArray(stored) &&
    "operator" in stored
  ) {
    const unwrapped = (stored as FilterEnvelope).value
    // An envelope that came back empty still has to become the control's own empty value, or
    // the field is handed `null` where it expects `[]`.
    return unwrapped === null || unwrapped === undefined
      ? getEmptyValue(type)
      : (unwrapped as FilterFormValue)
  }

  return stored as FilterFormValue
}

/**
 * The filtering a table opens with when nothing has been persisted, seeded from each filter's
 * `defaultValue` — so a screen can open already narrowed to what it is about.
 */
export function buildDefaultFiltering(
  filters: readonly DataTableFilter[]
): FilteringState {
  const filtering: FilteringState = {}

  for (const filter of filters) {
    const type = filterTypeOf(filter)

    if (
      filter.defaultValue === undefined ||
      isEmptyValue(type, filter.defaultValue)
    ) {
      continue
    }

    filtering[filter.field] = toFilterValue(type, filter.defaultValue)
  }

  return filtering
}

/**
 * Where the filtering state starts: what was persisted, if anything was, and the declared defaults
 * otherwise.
 *
 * Persistence wins outright rather than merging. A user who cleared a filter the table ships with a
 * default for cleared it on purpose, and merging would put it back on every reload.
 */
export function getInitialFiltering(
  filters: readonly DataTableFilter[],
  stored: FilteringState | undefined
): FilteringState {
  const hasStored = stored !== undefined && Object.keys(stored).length > 0
  return hasStored ? stored : buildDefaultFiltering(filters)
}
