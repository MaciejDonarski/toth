import { pageCount, pageRange } from "./page-range"
import { describe, expect, it } from "vitest"

describe("pageRange", () => {
  it("lists every page while they all fit", () => {
    expect(pageRange(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("returns nothing when there are no pages", () => {
    expect(pageRange(1, 0)).toEqual([])
  })

  it("collapses to one page", () => {
    expect(pageRange(1, 1)).toEqual([1])
  })

  it("elides the tail when the current page is at the start", () => {
    expect(pageRange(1, 20)).toEqual([1, 2, "ellipsis", 20])
  })

  it("elides the head when the current page is at the end", () => {
    expect(pageRange(20, 20)).toEqual([1, "ellipsis", 19, 20])
  })

  it("elides both sides in the middle", () => {
    expect(pageRange(10, 20)).toEqual([
      1,
      "ellipsis",
      9,
      10,
      11,
      "ellipsis",
      20,
    ])
  })

  it("lists a short pager in full rather than eliding into the same width", () => {
    // Seven is the widest the elided form gets at siblingCount 1, so anything up to it is
    // listed outright: `1 2 … 5` is no narrower than `1 2 3 4 5`.
    expect(pageRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(pageRange(4, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("fills a gap of exactly one page instead of eliding it", () => {
    // Pages 1 and 3..5 are shown, so page 2 is the only gap on that side — an ellipsis there
    // would be wider than the number and would hide a reachable page behind a click.
    expect(pageRange(4, 8)).toEqual([1, 2, 3, 4, 5, "ellipsis", 8])
  })

  it("widens the window with siblingCount", () => {
    expect(pageRange(10, 20, 2)).toEqual([
      1,
      "ellipsis",
      8,
      9,
      10,
      11,
      12,
      "ellipsis",
      20,
    ])
  })

  it("never repeats a page when the window overlaps the ends", () => {
    const items = pageRange(2, 4)
    expect(items).toEqual([1, 2, 3, 4])
    expect(new Set(items).size).toBe(items.length)
  })

  it("clamps a current page beyond the last one to the pages that exist", () => {
    expect(pageRange(99, 3)).toEqual([1, 2, 3])
  })
})

describe("pageCount", () => {
  it.each([
    [0, 25, 1],
    [1, 25, 1],
    [25, 25, 1],
    [26, 25, 2],
    [100, 25, 4],
    [101, 25, 5],
  ])(
    "fits %i items at %i per page into %i pages",
    (totalItems, pageSize, expected) => {
      expect(pageCount(totalItems, pageSize)).toBe(expected)
    }
  )

  it("never reports fewer than one page", () => {
    expect(pageCount(0, 10)).toBe(1)
  })

  it("survives a zero page size rather than dividing by it", () => {
    expect(pageCount(50, 0)).toBe(1)
  })
})
