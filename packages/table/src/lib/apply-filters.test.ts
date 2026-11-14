import { applyClientFilters, prepareServerFiltering } from "./apply-filters"
import type { DataTableFilter } from "./filter-types"
import { buildSearchEntry, SEARCH_KEY } from "./search-filtering"
import { describe, expect, it } from "vitest"

interface Row {
  sku: string
  weight: number
  state: string
  kind: string
  tags: string[]
  createdAt: string
  customer: { city: string }
}

const rows: Row[] = [
  {
    sku: "WIDGET-1",
    weight: 0,
    state: "active",
    kind: "a",
    tags: ["red"],
    createdAt: "2026-01-10 08:00:00",
    customer: { city: "Kraków" },
  },
  {
    sku: "widget-2",
    weight: 5,
    state: "archived",
    kind: "b",
    tags: ["blue", "red"],
    createdAt: "2026-02-20 08:00:00",
    customer: { city: "Gdańsk" },
  },
  {
    sku: "GADGET-3",
    weight: 10,
    state: "active",
    kind: "c",
    tags: ["green"],
    createdAt: "2026-03-30 08:00:00",
    customer: { city: "Kraków" },
  },
]

const skus = (result: Row[]) => result.map((row) => row.sku)

describe("applyClientFilters", () => {
  it("returns every row when nothing is set", () => {
    expect(applyClientFilters(rows, [], {})).toEqual(rows)
  })

  describe("text", () => {
    const filters: DataTableFilter[] = [{ field: "sku" }]

    it("matches on a substring", () => {
      expect(skus(applyClientFilters(rows, filters, { sku: "GET-1" }))).toEqual(
        ["WIDGET-1"]
      )
    })

    it("matches regardless of case", () => {
      // The old grid matched case-sensitively here while its search box did not, so the same
      // word behaved differently depending on which box it was typed into.
      expect(
        skus(applyClientFilters(rows, filters, { sku: "widget" }))
      ).toEqual(["WIDGET-1", "widget-2"])
    })

    it("reads a dotted field out of a nested row", () => {
      const nested: DataTableFilter[] = [{ field: "customer.city" }]
      expect(
        skus(applyClientFilters(rows, nested, { "customer.city": "krak" }))
      ).toEqual(["WIDGET-1", "GADGET-3"])
    })
  })

  describe("number range", () => {
    const filters: DataTableFilter[] = [{ field: "weight", type: "number" }]

    it("includes both bounds", () => {
      expect(
        skus(applyClientFilters(rows, filters, { weight: { from: 0, to: 5 } }))
      ).toEqual(["WIDGET-1", "widget-2"])
    })

    it("includes the upper bound exactly", () => {
      expect(
        skus(
          applyClientFilters(rows, filters, { weight: { from: 10, to: 10 } })
        )
      ).toEqual(["GADGET-3"])
    })

    it("treats a missing bound as open-ended", () => {
      expect(
        skus(
          applyClientFilters(rows, filters, { weight: { from: 5, to: null } })
        )
      ).toEqual(["widget-2", "GADGET-3"])
    })

    it("keeps a zero cell inside a range that starts at zero", () => {
      // The old predicate coerced a cell through `|| ''`, so a real 0 became an empty string.
      expect(
        skus(applyClientFilters(rows, filters, { weight: { from: 0, to: 0 } }))
      ).toEqual(["WIDGET-1"])
    })

    it("supports fractional bounds", () => {
      // The old predicate added 1 to the upper bound to fake an inclusive range, which is
      // only correct for whole numbers — 2.5 there meant "up to 3.5".
      expect(
        skus(
          applyClientFilters(rows, filters, { weight: { from: 0.5, to: 5.5 } })
        )
      ).toEqual(["widget-2"])
    })
  })

  describe("select", () => {
    const filters: DataTableFilter[] = [
      { field: "state", type: "select", options: [] },
    ]

    it("matches the chosen option, unwrapping the envelope", () => {
      expect(
        skus(
          applyClientFilters(rows, filters, {
            state: { operator: "eq", value: "active" },
          })
        )
      ).toEqual(["WIDGET-1", "GADGET-3"])
    })
  })

  describe("multi-select", () => {
    const filters: DataTableFilter[] = [
      { field: "kind", type: "multi-select", options: [] },
    ]

    it("matches any of the chosen options", () => {
      expect(
        skus(applyClientFilters(rows, filters, { kind: ["a", "c"] }))
      ).toEqual(["WIDGET-1", "GADGET-3"])
    })
  })

  describe("tags", () => {
    const filters: DataTableFilter[] = [{ field: "tags", type: "tags" }]

    it("matches a row whose list contains any chosen tag", () => {
      // The old predicate compared one cell against the whole array with `===`, so a
      // client-side tags filter matched nothing at all.
      expect(
        skus(
          applyClientFilters(rows, filters, {
            tags: { operator: "in", value: ["red"] },
          })
        )
      ).toEqual(["WIDGET-1", "widget-2"])
    })

    it("matches on any of several chosen tags", () => {
      expect(
        skus(
          applyClientFilters(rows, filters, {
            tags: { operator: "in", value: ["green", "blue"] },
          })
        )
      ).toEqual(["widget-2", "GADGET-3"])
    })
  })

  describe("date range", () => {
    const filters: DataTableFilter[] = [
      { field: "createdAt", type: "datetime" },
    ]

    it("includes rows on both bounds", () => {
      expect(
        skus(
          applyClientFilters(rows, filters, {
            createdAt: {
              from: "2026-01-10 08:00:00",
              to: "2026-02-20 08:00:00",
            },
          })
        )
      ).toEqual(["WIDGET-1", "widget-2"])
    })

    it("treats a missing end as open-ended", () => {
      expect(
        skus(
          applyClientFilters(rows, filters, {
            createdAt: { from: "2026-03-01 00:00:00", to: "" },
          })
        )
      ).toEqual(["GADGET-3"])
    })

    it("reads a date-only cell as well as a datetime one", () => {
      const dateRows = [{ createdAt: "2026-02-20" }]
      expect(
        applyClientFilters(dateRows, [{ field: "createdAt", type: "date" }], {
          createdAt: { from: "2026-02-01 00:00:00", to: "2026-02-28 23:59:59" },
        })
      ).toHaveLength(1)
    })

    it("drops a row whose cell is not a date at all", () => {
      const badRows = [{ createdAt: "never" }]
      expect(
        applyClientFilters(badRows, [{ field: "createdAt", type: "date" }], {
          createdAt: { from: "2026-01-01 00:00:00", to: "2026-12-31 23:59:59" },
        })
      ).toHaveLength(0)
    })
  })

  describe("search", () => {
    it("matches a case-insensitive substring across the searchable fields", () => {
      expect(
        skus(
          applyClientFilters(
            rows,
            [],
            { [SEARCH_KEY]: buildSearchEntry("gdan") },
            ["sku"]
          )
        )
      ).toEqual([])

      expect(
        skus(
          applyClientFilters(
            rows,
            [],
            { [SEARCH_KEY]: buildSearchEntry("gdań") },
            ["customer.city"]
          )
        )
      ).toEqual(["widget-2"])
    })

    it("does nothing without any searchable fields to look in", () => {
      expect(
        applyClientFilters(
          rows,
          [],
          { [SEARCH_KEY]: buildSearchEntry("zzz") },
          []
        )
      ).toEqual(rows)
    })

    it("narrows what the field filters already narrowed", () => {
      expect(
        skus(
          applyClientFilters(
            rows,
            [{ field: "state", type: "select", options: [] }],
            {
              state: { operator: "eq", value: "active" },
              [SEARCH_KEY]: buildSearchEntry("gadget"),
            },
            ["sku"]
          )
        )
      ).toEqual(["GADGET-3"])
    })
  })

  it("ignores a filter whose stored value is empty", () => {
    expect(applyClientFilters(rows, [{ field: "sku" }], { sku: "" })).toEqual(
      rows
    )
  })

  it("ignores a filtering key with no matching filter declared", () => {
    expect(applyClientFilters(rows, [{ field: "sku" }], { nope: "x" })).toEqual(
      rows
    )
  })

  it("uses getClientValue to derive the comparable value", () => {
    const objectRows = [
      { status: { code: "active" } },
      { status: { code: "archived" } },
    ]
    const filters: DataTableFilter[] = [
      {
        field: "status",
        type: "select",
        options: [],
        getClientValue: (raw) => (raw as { code: string }).code,
      },
    ]

    expect(
      applyClientFilters(objectRows, filters, {
        status: { operator: "eq", value: "active" },
      })
    ).toEqual([{ status: { code: "active" } }])
  })

  it("does not mutate the rows it was given", () => {
    const original = [...rows]
    applyClientFilters(rows, [{ field: "sku" }], { sku: "widget" })

    expect(rows).toEqual(original)
  })
})

describe("prepareServerFiltering", () => {
  const filters: DataTableFilter[] = [
    { field: "sku" },
    { field: "state", type: "select", options: [], serverField: "status_code" },
    { field: "weight", type: "number" },
  ]

  it("renames each key to its server field", () => {
    const payload = prepareServerFiltering(
      { state: { operator: "eq", value: "active" } },
      filters
    )

    expect(payload).toEqual({
      status_code: { operator: "eq", value: "active" },
    })
  })

  it("keeps a key that has no server field of its own", () => {
    expect(prepareServerFiltering({ sku: "ABC" }, filters)).toEqual({
      sku: "ABC",
    })
  })

  it("drops an empty string", () => {
    expect(prepareServerFiltering({ sku: "" }, filters)).toEqual({})
  })

  it("drops an empty envelope", () => {
    expect(
      prepareServerFiltering(
        { state: { operator: "eq", value: null } },
        filters
      )
    ).toEqual({})
  })

  it("drops an empty range but keeps a half-open one", () => {
    expect(
      prepareServerFiltering({ weight: { from: null, to: null } }, filters)
    ).toEqual({})
    expect(
      prepareServerFiltering({ weight: { from: 5, to: null } }, filters)
    ).toEqual({
      weight: { from: 5, to: null },
    })
  })

  it("keeps a zero bound, which is a value and not an absence", () => {
    expect(
      prepareServerFiltering({ weight: { from: 0, to: 0 } }, filters)
    ).toEqual({
      weight: { from: 0, to: 0 },
    })
  })

  it("forwards a search term under its reserved key, unrenamed", () => {
    expect(
      prepareServerFiltering(
        { [SEARCH_KEY]: buildSearchEntry("widget") },
        filters
      )
    ).toEqual({ [SEARCH_KEY]: buildSearchEntry("widget") })
  })

  it("drops a blank search term", () => {
    expect(
      prepareServerFiltering({ [SEARCH_KEY]: buildSearchEntry("") }, filters)
    ).toEqual({})
  })
})
