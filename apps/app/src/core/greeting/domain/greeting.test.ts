import { describe, expect, it } from "vitest"

import { createGreeting, InvalidRecipientError } from "./greeting"

describe("createGreeting", () => {
  it("builds the greeting for a recipient", () => {
    expect(createGreeting("world")).toEqual({
      recipient: "world",
    })
  })

  it("trims the recipient", () => {
    expect(createGreeting("  Ada ").recipient).toBe("Ada")
  })

  it("rejects an empty recipient", () => {
    expect(() => createGreeting("   ")).toThrow(InvalidRecipientError)
  })

  it("returns an immutable value", () => {
    expect(Object.isFrozen(createGreeting("world"))).toBe(true)
  })
})
