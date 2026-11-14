import type { FilteringState, SearchEntry } from "./filter-types"
import { omitKeys, pickKeys } from "./object"

// The full-text term shares the filtering map with the field filters, under a reserved key. Every
// read and write of that key lives here: the constant and the envelope shape are the server's, and
// scattering them across the filter hook, the search box and the async layer is how one of the
// three ends up spelling it differently.

/** The reserved key the search term is stored under, alongside the field filters. */
export const SEARCH_KEY = "fulltext_search"

const SEARCH_FIELD_TYPE = "fulltext_search"
const SEARCH_FILTER_TYPE = "search"

function isSearchEntry(value: unknown): value is SearchEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "fieldType" in value
  )
}

/** The current term, or an empty string when there is none. */
export function getSearchValue(filtering: FilteringState): string {
  const entry = filtering[SEARCH_KEY]
  return isSearchEntry(entry) ? entry.value : ""
}

/** The envelope a term is stored in. */
export function buildSearchEntry(value: string): SearchEntry {
  return {
    fieldType: SEARCH_FIELD_TYPE,
    filterType: SEARCH_FILTER_TYPE,
    value: value.trim(),
  }
}

/** The field filters on their own. */
export function omitSearch(filtering: FilteringState): FilteringState {
  return omitKeys(filtering, [SEARCH_KEY])
}

/** The search entry on its own — how it survives a filter-panel apply that does not know about it. */
export function pickSearch(filtering: FilteringState): FilteringState {
  return pickKeys(filtering, [SEARCH_KEY])
}

/**
 * Drops a search entry whose term is blank, before the state is committed.
 *
 * An emptied search box would otherwise leave `{ value: '' }` behind, which is not nothing: it goes
 * out in the server payload and it changes the refetch cache key, so clearing the box would cost a
 * request that returns exactly what was already on screen.
 */
export function sanitizeFiltering(filtering: FilteringState): FilteringState {
  const entry = filtering[SEARCH_KEY]

  if (isSearchEntry(entry) && entry.value.trim() === "") {
    return omitSearch(filtering)
  }

  return filtering
}
