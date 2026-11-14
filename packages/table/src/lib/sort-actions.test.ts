import { sortActionsByOrder } from "./sort-actions"
import { describe, expect, it } from "vitest"

interface Item {
  id: string
  order?: number
}

const ids = (entries: (Item | Item[])[]) =>
  entries.map((entry) =>
    Array.isArray(entry) ? entry.map((item) => item.id) : entry.id
  )

describe("sortActionsByOrder", () => {
  it("orders by the declared order", () => {
    const sorted = sortActionsByOrder<Item>([
      { id: "filters", order: 900 },
      { id: "export", order: 10 },
      { id: "columns", order: 800 },
    ])

    expect(ids(sorted)).toEqual(["export", "columns", "filters"])
  })

  it("keeps unordered entries in the order they were given", () => {
    const sorted = sortActionsByOrder<Item>([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ])

    expect(ids(sorted)).toEqual(["a", "b", "c"])
  })

  it("places an unordered entry on the same scale as the explicit ones", () => {
    // The first unordered entry counts as 10, the second as 20 — so an action asking for 15
    // lands between them rather than at one end.
    const sorted = sortActionsByOrder<Item>([
      { id: "first" },
      { id: "second" },
      { id: "between", order: 15 },
    ])

    expect(ids(sorted)).toEqual(["first", "between", "second"])
  })

  it("is stable for equal orders", () => {
    const sorted = sortActionsByOrder<Item>([
      { id: "a", order: 10 },
      { id: "b", order: 10 },
      { id: "c", order: 10 },
    ])

    expect(ids(sorted)).toEqual(["a", "b", "c"])
  })

  it("orders a group by its first member and leaves the group intact", () => {
    const sorted = sortActionsByOrder<Item>([
      { id: "last", order: 100 },
      [
        { id: "edit", order: 20 },
        { id: "delete", order: 5 },
      ],
    ])

    expect(ids(sorted)).toEqual([["edit", "delete"], "last"])
  })

  it("does not mutate the input", () => {
    const entries: Item[] = [
      { id: "b", order: 20 },
      { id: "a", order: 10 },
    ]
    sortActionsByOrder(entries)

    expect(entries.map((item) => item.id)).toEqual(["b", "a"])
  })

  it("handles an empty list", () => {
    expect(sortActionsByOrder<Item>([])).toEqual([])
  })
})
