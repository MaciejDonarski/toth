import { describe, expect, it } from "vitest"

import { createGreeting, InvalidRecipientError } from "./greeting"

describe("createGreeting", () => {
  it("builds the greeting message for a recipient", () => {
    expect(createGreeting("world")).toEqual({
      recipient: "world",
      message: "Hello, world!",
    })
  })

  it("trims the recipient", () => {
    expect(createGreeting("  Ada ").message).toBe("Hello, Ada!")
  })

  it("rejects an empty recipient", () => {
    expect(() => createGreeting("   ")).toThrow(InvalidRecipientError)
  })

  it("returns an immutable value", () => {
    expect(Object.isFrozen(createGreeting("world"))).toBe(true)
  })
})
