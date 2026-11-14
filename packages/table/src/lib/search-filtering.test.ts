import {
  buildSearchEntry,
  getSearchValue,
  omitSearch,
  pickSearch,
  sanitizeFiltering,
  SEARCH_KEY,
} from "./search-filtering"
import { describe, expect, it } from "vitest"

const search = buildSearchEntry("widget")
const withSearch = { sku: "ABC", [SEARCH_KEY]: search }

describe("buildSearchEntry", () => {
  it("carries the term inside the envelope the server expects", () => {
    expect(buildSearchEntry("widget")).toEqual({
      fieldType: "fulltext_search",
      filterType: "search",
      value: "widget",
    })
  })

  it("trims the term", () => {
    expect(buildSearchEntry("  widget  ").value).toBe("widget")
  })
})

describe("getSearchValue", () => {
  it("reads the term out of the envelope", () => {
    expect(getSearchValue(withSearch)).toBe("widget")
  })

  it("reads an empty string when there is no search entry", () => {
    expect(getSearchValue({ sku: "ABC" })).toBe("")
  })
})

describe("omitSearch / pickSearch", () => {
  it("splits the field filters from the search term", () => {
    expect(omitSearch(withSearch)).toEqual({ sku: "ABC" })
    expect(pickSearch(withSearch)).toEqual({ [SEARCH_KEY]: search })
  })

  it("picks nothing when there is no search entry", () => {
    expect(pickSearch({ sku: "ABC" })).toEqual({})
  })
})

describe("sanitizeFiltering", () => {
  it("keeps a search entry that carries a term", () => {
    expect(sanitizeFiltering(withSearch)).toEqual(withSearch)
  })

  it("drops a blank search entry", () => {
    // Left in, `{ value: '' }` would go out in the server payload and change the refetch key,
    // so clearing the box would cost a request returning what is already on screen.
    expect(
      sanitizeFiltering({ sku: "ABC", [SEARCH_KEY]: buildSearchEntry("") })
    ).toEqual({
      sku: "ABC",
    })
  })

  it("drops a whitespace-only search entry", () => {
    expect(
      sanitizeFiltering({ [SEARCH_KEY]: buildSearchEntry("   ") })
    ).toEqual({})
  })

  it("leaves filtering without a search entry alone", () => {
    expect(sanitizeFiltering({ sku: "ABC" })).toEqual({ sku: "ABC" })
  })
})
