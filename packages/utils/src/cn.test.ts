import { describe, expect, it } from "vitest"

import { cn } from "./cn"

describe("cn", () => {
  it("joins class names and skips falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b")
  })

  it("supports conditional object and array syntax", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b")
  })

  it("resolves conflicting Tailwind utilities, last one wins", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
    expect(cn("text-sm text-red-500", "text-blue-500")).toBe(
      "text-sm text-blue-500"
    )
  })
})
