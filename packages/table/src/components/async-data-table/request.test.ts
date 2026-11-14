import type { DataTableColumn } from "../data-table/data-table.types"
import type { FilteringState } from "../../lib/filter-types"
import type { DataTableState } from "../../lib/table-state"
import { describe, expect, it } from "vitest"

import {
  buildRequest,
  hasUnfetchedField,
  resolveExportFields,
  resolveFields,
  resolveSorting,
  serverKey,
} from "./request"

interface Row {
  id: number
}

const columns: DataTableColumn<Row>[] = [
  { id: "sku" },
  { id: "customer", field: "customer_name" },
  { id: "created", field: "created_at", sortField: "created_at_utc" },
  {
    id: "name",
    field: "first_name",
    exportFields: ["first_name", "last_name"],
  },
]

const baseState: DataTableState<Row> = {
  sort: { columnId: "", direction: "" },
  filtering: {},
  pagination: { currentPage: 1, pageSize: 25, totalItems: 100, totalPages: 4 },
  selectedIds: [],
  selectedRows: [],
  hiddenColumns: [],
  visibleColumns: ["sku", "customer"],
}

/** The base state, narrowed to one filtering — for the cases that are only about filtering. */
const withFiltering = (filtering: FilteringState): DataTableState<Row> => ({
  ...baseState,
  filtering,
})

describe("resolveSorting", () => {
  it("is absent when nothing is sorted", () => {
    expect(
      resolveSorting({ columnId: "", direction: "" }, columns)
    ).toBeUndefined()
    expect(
      resolveSorting({ columnId: "sku", direction: "" }, columns)
    ).toBeUndefined()
  })

  it("falls back to the column id when it has no field", () => {
    expect(
      resolveSorting({ columnId: "sku", direction: "asc" }, columns)
    ).toEqual({
      columnId: "sku",
      dir: "asc",
      field: "sku",
    })
  })

  it("uses the column field", () => {
    expect(
      resolveSorting({ columnId: "customer", direction: "desc" }, columns)
        ?.field
    ).toBe("customer_name")
  })

  it("prefers an explicit sortField over the field", () => {
    expect(
      resolveSorting({ columnId: "created", direction: "asc" }, columns)?.field
    ).toBe("created_at_utc")
  })

  it("keeps the column id beside the field, so a consumer knows which column was clicked", () => {
    expect(
      resolveSorting({ columnId: "created", direction: "asc" }, columns)
        ?.columnId
    ).toBe("created")
  })
})

describe("resolveFields", () => {
  it("maps ids to their server fields", () => {
    expect(resolveFields(["sku", "customer"], columns)).toEqual([
      "sku",
      "customer_name",
    ])
  })

  it("passes an unknown id straight through", () => {
    expect(resolveFields(["mystery"], columns)).toEqual(["mystery"])
  })
})

describe("resolveExportFields", () => {
  it("expands a column built from several fields", () => {
    expect(resolveExportFields(["name"], columns)).toEqual([
      "first_name",
      "last_name",
    ])
  })

  it("uses the plain field for a column with no export fields", () => {
    expect(resolveExportFields(["customer"], columns)).toEqual([
      "customer_name",
    ])
  })

  it("asks for a shared field once", () => {
    expect(resolveExportFields(["name", "name"], columns)).toEqual([
      "first_name",
      "last_name",
    ])
  })
})

describe("buildRequest", () => {
  it("asks only for the visible columns", () => {
    expect(buildRequest(baseState, columns, []).fields).toEqual([
      "sku",
      "customer_name",
    ])
  })

  it("carries the page", () => {
    expect(buildRequest(baseState, columns, []).pagination).toEqual({
      currentPage: 1,
      pageSize: 25,
    })
  })

  it("leaves sorting out when nothing is sorted", () => {
    expect(buildRequest(baseState, columns, [])).not.toHaveProperty(
      "sorting",
      expect.anything()
    )
    expect(buildRequest(baseState, columns, []).sorting).toBeUndefined()
  })

  it("renames a filter to its server field and drops the empty ones", () => {
    const request = buildRequest(
      {
        ...baseState,
        filtering: { state: { operator: "eq", value: "active" }, sku: "" },
      },
      columns,
      [
        {
          field: "state",
          type: "select",
          options: [],
          serverField: "status_code",
        },
        { field: "sku" },
      ]
    )

    expect(request.filtering).toEqual({
      status_code: { operator: "eq", value: "active" },
    })
  })
})

describe("serverKey", () => {
  it("changes with the page", () => {
    const next = {
      ...baseState,
      pagination: { ...baseState.pagination, currentPage: 2 },
    }

    expect(serverKey(next)).not.toBe(serverKey(baseState))
  })

  it("changes with the sort", () => {
    const next: DataTableState<Row> = {
      ...baseState,
      sort: { columnId: "sku", direction: "asc" },
    }

    expect(serverKey(next)).not.toBe(serverKey(baseState))
  })

  it("changes with the filtering", () => {
    const next = { ...baseState, filtering: { sku: "widget" } }

    expect(serverKey(next)).not.toBe(serverKey(baseState))
  })

  it("does NOT change with the selection", () => {
    // Ticking a row asks the server nothing.
    const next = {
      ...baseState,
      selectedIds: [1, 2],
      selectedRows: [{ id: 1 }, { id: 2 }],
    }

    expect(serverKey(next)).toBe(serverKey(baseState))
  })

  it("does NOT change with column visibility", () => {
    // Handled separately, by whether a newly shown column brings an unfetched field.
    const next = {
      ...baseState,
      visibleColumns: ["sku"],
      hiddenColumns: ["customer"],
    }

    expect(serverKey(next)).toBe(serverKey(baseState))
  })

  it("is the same for one filtering written two ways", () => {
    // An envelope can be built in either key order, and two spellings of one filter would
    // otherwise look like two filters and cost a request each.
    const a = withFiltering({ state: { operator: "eq", value: "x" } })
    const b = withFiltering({ state: { value: "x", operator: "eq" } })

    expect(serverKey(a)).toBe(serverKey(b))
  })

  it("sorts nested keys too, not just the top level", () => {
    // A shape deeper than any filter type produces today, on purpose: the guarantee being
    // tested is that `canonicalize` recurses, not that this particular filter exists.
    const a = withFiltering({
      r: { from: { a: 1, b: 2 }, to: null },
    } as unknown as FilteringState)
    const b = withFiltering({
      r: { to: null, from: { b: 2, a: 1 } },
    } as unknown as FilteringState)

    expect(serverKey(a)).toBe(serverKey(b))
  })
})

describe("hasUnfetchedField", () => {
  it("is true before anything has been fetched", () => {
    expect(hasUnfetchedField(["sku"], null)).toBe(true)
  })

  it("is false when every field is already in hand", () => {
    expect(hasUnfetchedField(["sku"], new Set(["sku", "customer_name"]))).toBe(
      false
    )
  })

  it("is true when one field is new", () => {
    expect(hasUnfetchedField(["sku", "created_at"], new Set(["sku"]))).toBe(
      true
    )
  })

  it("is false for fewer fields than were fetched — hiding a column asks nothing", () => {
    expect(hasUnfetchedField([], new Set(["sku"]))).toBe(false)
  })
})
