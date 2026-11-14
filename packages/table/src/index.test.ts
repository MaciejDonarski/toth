import { describe, expect, it } from "vitest"

import * as table from "./index"

describe("@toth/table", () => {
  it("exposes the three tables, their parts and the message catalogs", () => {
    for (const name of [
      "PlainTable",
      "DataTable",
      "AsyncDataTable",
      "DataTableConfigProvider",
      "DataTableToolbar",
      "DataTableFilterPanel",
      "DataTablePagination",
      "tableApi",
      "useTableLocale",
    ]) {
      expect(table).toHaveProperty(name)
    }
    expect(table.enMessages.filters.apply).toBe("Apply")
    expect(table.plMessages.filters.apply).toBe("Zastosuj")
  })

  it("keeps the Polish catalog key for key with the English one", () => {
    const keys = (messages: object) =>
      Object.entries(messages).flatMap(([group, entries]) =>
        Object.keys(entries as object).map((key) => `${group}.${key}`)
      )
    expect(keys(table.plMessages).sort()).toEqual(keys(table.enMessages).sort())
  })
})
