import { describe, expect, it } from "vitest"

import { colSpanClassName } from "./grid"

describe("colSpanClassName", () => {
  it("defaults to full width", () => {
    expect(colSpanClassName()).toBe("col-span-12")
  })

  it("falls back to base 12 and keeps breakpoint order", () => {
    expect(colSpanClassName({ lg: 4, md: 6 })).toBe(
      "col-span-12 md:col-span-6 lg:col-span-4"
    )
  })

  it("respects an explicit base", () => {
    expect(colSpanClassName({ base: 6, "2xl": 3 })).toBe(
      "col-span-6 2xl:col-span-3"
    )
  })
})
