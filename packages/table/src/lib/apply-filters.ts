import type {
  DataTableFilter,
  DataTableFilterType,
  FilterEnvelope,
  FilteringState,
  FilterValue,
} from "./filter-types"
import { filterTypeOf, isEmptyValue } from "./filter-types"
import { parseDate } from "./format"
import { getPath } from "./object"
import { getSearchValue, SEARCH_KEY } from "./search-filtering"

// Client-side filtering, for a table holding every row it will ever show, and the server payload
// builder for one that does not. The two live together because they read the same `filters`
// declaration and the same filtering state, and a difference between them is a bug the user sees as
// "the numbers change when I turn on server mode".
//
// The predicates deliberately do NOT reproduce their counterparts in the old grid, which were
// broken in three ways worth naming:
//
//   - text matched case-SENSITIVELY while the full-text search beside it did not, so `Widget`
//     and `widget` behaved differently depending on which box you typed in;
//   - tags compared a single cell value against the whole tag ARRAY with `===`, which is never
//     true, so a client-side tags filter matched nothing at all;
//   - number and date ranges leaned on lodash's half-open `inRange` and added 1 to the upper
//     bound to make it inclusive, which is only correct for whole numbers and whole seconds.
//
// Here the ranges are inclusive at both ends, text is case-insensitive, and tags matches when the
// row's value is one of the chosen tags.

/** Unwraps the `{ operator, value }` envelope the stored value may carry. */
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

function asText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value)
}

/**
 * A cell as a number, or `null` when it is not one.
 *
 * `null` rather than `0` so an empty cell falls OUT of every range instead of landing at the
 * origin — a row with no weight is not a row that weighs nothing.
 */
function asNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

/**
 * A cell as an instant, or `null` when it is not one.
 *
 * ISO dates and datetimes, `Date`s and timestamps all count — see `parseDate`.
 */
function asTimestamp(value: unknown): number | null {
  return parseDate(value)?.getTime() ?? null
}

/** Every value a cell offers a set filter to match against — a list cell matches on any member. */
function asCandidates(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asText) : [asText(value)]
}

function inRange(
  value: number | null,
  from: number | null,
  to: number | null
): boolean {
  if (value === null) {
    return false
  }

  // Inclusive at both ends: a range typed as 1–10 is read by the person who typed it as including
  // both 1 and 10, and a half-open range silently drops the last row.
  return (from === null || value >= from) && (to === null || value <= to)
}

function matches(
  type: DataTableFilterType,
  cell: unknown,
  chosen: unknown
): boolean {
  switch (type) {
    case "select":
      return asCandidates(cell).includes(asText(chosen))

    case "multi-select":
    case "tags": {
      const wanted = Array.isArray(chosen)
        ? chosen.map(asText)
        : [asText(chosen)]
      return asCandidates(cell).some((candidate) => wanted.includes(candidate))
    }

    case "number": {
      const { from, to } = (chosen ?? {}) as { from?: unknown; to?: unknown }
      return inRange(asNumber(cell), asNumber(from), asNumber(to))
    }

    case "date":
    case "datetime": {
      const { from, to } = (chosen ?? {}) as { from?: unknown; to?: unknown }
      return inRange(asTimestamp(cell), asTimestamp(from), asTimestamp(to))
    }

    default:
      return asText(cell)
        .toLowerCase()
        .includes(asText(chosen).trim().toLowerCase())
  }
}

/**
 * The rows that survive every set filter, and then the full-text term.
 *
 * Used only when the table owns all of its data. In `manual` mode the server has already done this
 * and the rows pass through untouched.
 */
export function applyClientFilters<TRow>(
  rows: readonly TRow[],
  filters: readonly DataTableFilter[],
  filtering: FilteringState,
  searchableFields: readonly string[] = []
): TRow[] {
  if (Object.keys(filtering).length === 0) {
    return rows as TRow[]
  }

  let result = rows as TRow[]

  for (const filter of filters) {
    const stored = filtering[filter.field]

    if (stored === undefined) {
      continue
    }

    const type = filterTypeOf(filter)
    const chosen = unwrap(stored as FilterValue)

    if (isEmptyValue(type, chosen)) {
      continue
    }

    result = result.filter((row) => {
      const raw = getPath(row, filter.field)
      const cell = filter.getClientValue ? filter.getClientValue(raw) : raw
      return matches(type, cell, chosen)
    })
  }

  const term = getSearchValue(filtering).trim().toLowerCase()

  if (term !== "" && searchableFields.length > 0) {
    result = result.filter((row) =>
      searchableFields.some((field) =>
        asText(getPath(row, field)).toLowerCase().includes(term)
      )
    )
  }

  return result
}

/** Whether a stored value carries nothing and should be left out of the request. */
function isEmptyStored(value: unknown): boolean {
  if (value === null || value === undefined || value === "") {
    return true
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (typeof value === "object") {
    if ("operator" in value) {
      return isEmptyStored((value as FilterEnvelope).value)
    }

    if ("from" in value || "to" in value) {
      const { from, to } = value as { from?: unknown; to?: unknown }
      return isEmptyStored(from) && isEmptyStored(to)
    }
  }

  return false
}

/**
 * The filtering state as the server wants it: keyed by each filter's `serverField`, with empty
 * values dropped and the search term forwarded under its reserved key.
 *
 * The state stays keyed by `field` throughout the table, so persisted state and active-filter chips
 * survive a `serverField` being introduced or changed later.
 */
export function prepareServerFiltering(
  filtering: FilteringState,
  filters: readonly DataTableFilter[]
): Record<string, unknown> {
  const serverField = new Map<string, string>()

  for (const filter of filters) {
    serverField.set(filter.field, filter.serverField ?? filter.field)
  }

  const payload: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(filtering)) {
    if (key === SEARCH_KEY) {
      // The search entry is forwarded whole — the two extra members are the server's contract
      // — but only when it actually carries a term.
      if (getSearchValue(filtering) !== "") {
        payload[key] = value
      }
      continue
    }

    if (isEmptyStored(value)) {
      continue
    }

    payload[serverField.get(key) ?? key] = value
  }

  return payload
}
