import { describe, expect, it } from "vitest"

import { safeRedirectPath } from "./safe-redirect"

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/users?page=2", "/settings#security"])(
    "keeps same-origin path %s",
    (path) => {
      expect(safeRedirectPath(path)).toBe(path)
    }
  )

  it.each([
    undefined,
    "",
    "dashboard",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "/redirect?to=https://evil.com",
    "/ evil",
    "/login",
    "/login/verify",
    "/register",
  ])("falls back to /dashboard for %j", (value) => {
    expect(safeRedirectPath(value)).toBe("/dashboard")
  })
})
