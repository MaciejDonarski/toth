import { describe, expect, it } from "vitest"

import { failedPasswordRules, isPasswordValid } from "./password-policy"

describe("password policy", () => {
  it("accepts a password meeting every rule", () => {
    expect(isPasswordValid("Zaq1@wsx")).toBe(true)
    expect(isPasswordValid("Żółć-2026")).toBe(true)
  })

  it.each([
    ["Aa1!", "minLength"],
    ["zaq1@wsx", "uppercase"],
    ["ZAQ1@WSX", "lowercase"],
    ["Zaq!@wsx", "digit"],
    ["Zaq12wsx", "special"],
  ] as const)("rejects %s for %s", (password, rule) => {
    expect(failedPasswordRules(password)).toContain(rule)
    expect(isPasswordValid(password)).toBe(false)
  })

  it("does not count whitespace as a special character", () => {
    expect(failedPasswordRules("Zaq12 wsx")).toContain("special")
  })

  it("rejects passwords over 128 characters", () => {
    expect(failedPasswordRules(`Aa1!${"x".repeat(125)}`)).toEqual(["maxLength"])
  })
})
