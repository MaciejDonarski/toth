import type { DataTableFilter } from "./filter-types"
import {
  buildDefaultFiltering,
  filterTypeOf,
  fromFilterValue,
  getEmptyValue,
  getInitialFiltering,
  isEmptyValue,
  toFilterValue,
} from "./filter-types"
import { describe, expect, it } from "vitest"

describe("filterTypeOf", () => {
  it("defaults to text", () => {
    expect(filterTypeOf({ field: "sku" })).toBe("text")
  })

  it("keeps a declared type", () => {
    expect(filterTypeOf({ field: "weight", type: "number" })).toBe("number")
  })
})

describe("getEmptyValue", () => {
  // These follow @toth/form's own empty values, not a convention of ours — a single
  // select really is empty at null, and handing it '' shows a selected blank option.
  it.each([
    ["text", ""],
    ["select", null],
    ["multi-select", []],
    ["tags", []],
    ["number", { from: null, to: null }],
    ["date", null],
    ["datetime", null],
  ] as const)("gives %s an empty value of %o", (type, expected) => {
    expect(getEmptyValue(type)).toEqual(expected)
  })
})

describe("isEmptyValue", () => {
  it.each([
    ["text", "", true],
    ["text", "  ", false],
    ["text", "abc", false],
    ["select", null, true],
    ["select", "", true],
    ["select", "active", false],
    ["multi-select", [], true],
    ["multi-select", ["a"], false],
    ["tags", [], true],
    ["number", { from: null, to: null }, true],
    ["number", { from: 0, to: null }, false],
    ["number", { from: null, to: 10 }, false],
    ["date", null, true],
    ["date", { from: "", to: "" }, true],
    ["date", { from: new Date(2026, 0, 1), to: undefined }, false],
  ] as const)("reads %s value %o as empty=%s", (type, value, expected) => {
    expect(isEmptyValue(type, value)).toBe(expected)
  })

  it("treats a zero lower bound as set rather than as absent", () => {
    // The bug this guards: `from || 0` cannot tell "no lower bound" from "zero or more".
    expect(isEmptyValue("number", { from: 0, to: null })).toBe(false)
  })
})

describe("toFilterValue", () => {
  it("wraps a select in an eq envelope", () => {
    expect(toFilterValue("select", "active")).toEqual({
      operator: "eq",
      value: "active",
    })
  })

  it("wraps tags in an in envelope", () => {
    expect(toFilterValue("tags", ["a", "b"])).toEqual({
      operator: "in",
      value: ["a", "b"],
    })
  })

  it("sends a multi-select bare, without an envelope", () => {
    expect(toFilterValue("multi-select", ["a", "b"])).toEqual(["a", "b"])
  })

  it("passes ranges through unchanged", () => {
    expect(toFilterValue("number", { from: 1, to: 9 })).toEqual({
      from: 1,
      to: 9,
    })
  })

  it("stores a date range as ISO datetimes spanning whole days", () => {
    const stored = toFilterValue("date", {
      from: new Date(2026, 0, 10, 15, 30),
      to: new Date(2026, 0, 12),
    }) as { from: string; to: string }
    expect(new Date(stored.from)).toEqual(new Date(2026, 0, 10, 0, 0, 0))
    expect(new Date(stored.to)).toEqual(new Date(2026, 0, 12, 23, 59, 59))
    expect(
      toFilterValue("date", { from: new Date(2026, 0, 10) })
    ).toMatchObject({ to: "" })
  })

  it("trims text", () => {
    expect(toFilterValue("text", "  sku-1  ")).toBe("sku-1")
  })
})

describe("fromFilterValue", () => {
  it("turns a stored date range back into Dates", () => {
    const from = new Date(2026, 0, 10)
    expect(
      fromFilterValue("date", { from: from.toISOString(), to: "" })
    ).toEqual({ from, to: undefined })
    expect(fromFilterValue("date", { from: "", to: "" })).toBeNull()
  })

  it("unwraps an eq envelope", () => {
    expect(fromFilterValue("select", { operator: "eq", value: "active" })).toBe(
      "active"
    )
  })

  it("unwraps an in envelope back to the array the control wants", () => {
    expect(fromFilterValue("tags", { operator: "in", value: ["a"] })).toEqual([
      "a",
    ])
  })

  it("turns an empty envelope into the control-specific empty value", () => {
    // Not `null`: a tags control handed null has no array to render.
    expect(fromFilterValue("tags", { operator: "in", value: null })).toEqual([])
    expect(
      fromFilterValue("select", { operator: "eq", value: null })
    ).toBeNull()
  })

  it("gives an absent value the control-specific empty value", () => {
    expect(fromFilterValue("multi-select", undefined)).toEqual([])
    expect(fromFilterValue("number", undefined)).toEqual({
      from: null,
      to: null,
    })
  })

  it("passes an unenveloped value through", () => {
    expect(fromFilterValue("text", "sku-1")).toBe("sku-1")
    expect(fromFilterValue("multi-select", ["a"])).toEqual(["a"])
  })

  it("round-trips every enveloped type", () => {
    expect(fromFilterValue("select", toFilterValue("select", "active"))).toBe(
      "active"
    )
    expect(fromFilterValue("tags", toFilterValue("tags", ["a", "b"]))).toEqual([
      "a",
      "b",
    ])
  })
})

describe("buildDefaultFiltering", () => {
  const filters: DataTableFilter[] = [
    { field: "sku", defaultValue: "ABC" },
    { field: "state", type: "select", options: [], defaultValue: "active" },
    { field: "kind", type: "multi-select", options: [], defaultValue: [] },
    { field: "weight", type: "number" },
  ]

  it("seeds from each declared default, in the stored shape", () => {
    expect(buildDefaultFiltering(filters)).toEqual({
      sku: "ABC",
      state: { operator: "eq", value: "active" },
    })
  })

  it("skips a default that is itself empty", () => {
    expect(buildDefaultFiltering(filters)).not.toHaveProperty("kind")
  })

  it("skips a filter with no default at all", () => {
    expect(buildDefaultFiltering(filters)).not.toHaveProperty("weight")
  })
})

describe("getInitialFiltering", () => {
  const filters: DataTableFilter[] = [{ field: "sku", defaultValue: "ABC" }]

  it("uses the declared defaults when nothing was persisted", () => {
    expect(getInitialFiltering(filters, undefined)).toEqual({ sku: "ABC" })
  })

  it("uses the declared defaults when the persisted state is empty", () => {
    expect(getInitialFiltering(filters, {})).toEqual({ sku: "ABC" })
  })

  it("lets persisted state win outright rather than merging", () => {
    // A user who cleared `sku` cleared it on purpose; merging would put the default back on
    // every reload.
    expect(
      getInitialFiltering(filters, { state: { operator: "eq", value: "x" } })
    ).toEqual({
      state: { operator: "eq", value: "x" },
    })
  })
})
