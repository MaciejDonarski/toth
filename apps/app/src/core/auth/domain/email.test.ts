import { describe, expect, it } from "vitest"

import { maskEmail, normalizeEmail } from "./email"

describe("email helpers", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeEmail("  Jan.Kowalski@Firma.PL ")).toBe(
      "jan.kowalski@firma.pl"
    )
  })

  it("masks the local part", () => {
    expect(maskEmail("Jan.Kowalski@firma.pl")).toBe("j***@firma.pl")
    expect(maskEmail("not-an-email")).toBe("***")
  })
})
