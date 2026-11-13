import { describe, expect, it } from "vitest"

import { emailSchema, registerSchema } from "./schemas"

const valid = {
  companyName: "  Acme Sp. z o.o. ",
  email: " Jan@Firma.PL ",
  password: "Zaq1@wsx",
  confirmPassword: "Zaq1@wsx",
  acceptTerms: true,
}

function issues(input: unknown) {
  const result = registerSchema.safeParse(input)
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]))
}

describe("registerSchema", () => {
  it("normalizes valid input", () => {
    expect(registerSchema.parse(valid)).toMatchObject({
      companyName: "Acme Sp. z o.o.",
      email: "jan@firma.pl",
    })
  })

  it("requires terms acceptance", () => {
    expect(issues({ ...valid, acceptTerms: false })).toEqual({
      acceptTerms: "Musisz zaakceptować regulamin",
    })
  })

  it("enforces the password policy", () => {
    expect(
      issues({ ...valid, password: "weak", confirmPassword: "weak" })
    ).toEqual({
      password: "Hasło nie spełnia wymagań",
    })
  })

  it("reports mismatched passwords even when other fields are invalid", () => {
    expect(
      issues({ ...valid, companyName: "", confirmPassword: "Zaq1@wsy" })
    ).toEqual({
      companyName: "Podaj nazwę firmy",
      confirmPassword: "Hasła nie są identyczne",
    })
  })
})

describe("emailSchema", () => {
  it.each(["", "nope", "a@", "@b.pl"])("rejects %j", (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false)
  })
})
