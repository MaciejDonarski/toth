import { fromFieldName, toFieldName } from "./field-name"
import { describe, expect, it } from "vitest"

describe("field name escaping", () => {
  it("leaves a plain field alone", () => {
    expect(toFieldName("sku")).toBe("sku")
    expect(fromFieldName("sku")).toBe("sku")
  })

  it("escapes a dot, which react-hook-form would read as a path", () => {
    expect(toFieldName("customer.address.city")).toBe(
      "customer-dot-address-dot-city"
    )
  })

  it("restores every dot on the way back", () => {
    expect(fromFieldName("customer-dot-address-dot-city")).toBe(
      "customer.address.city"
    )
  })

  it("round-trips", () => {
    for (const field of [
      "sku",
      "a.b",
      "a.b.c",
      "order.customer.address.city",
    ]) {
      expect(fromFieldName(toFieldName(field))).toBe(field)
    }
  })

  it("leaves an existing hyphen intact", () => {
    expect(fromFieldName(toFieldName("created-at.date"))).toBe(
      "created-at.date"
    )
  })
})
