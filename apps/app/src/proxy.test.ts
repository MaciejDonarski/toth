// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { proxy } from "./proxy"

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  })
}

describe("proxy", () => {
  it("redirects anonymous visitors to /login with a callback", () => {
    const response = proxy(request("/users?page=2"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fusers%3Fpage%3D2"
    )
  })

  it("lets requests with a session cookie through (the DAL validates it)", () => {
    for (const cookie of [
      "authjs.session-token=x",
      "__Secure-authjs.session-token=x",
      "__Secure-authjs.session-token.0=x",
    ]) {
      expect(
        proxy(request("/dashboard", cookie)).headers.get("location")
      ).toBeNull()
    }
  })

  it("ignores look-alike cookies", () => {
    const response = proxy(request("/dashboard", "authjs.session-token-fake=x"))
    expect(response.headers.get("location")).toContain("/login")
  })

  it.each([
    "/login",
    "/login/verify",
    "/register/check-email",
    "/verify-email",
    "/regulamin",
  ])("leaves public route %s alone", (path) => {
    expect(proxy(request(path)).headers.get("location")).toBeNull()
  })

  it("does not treat prefixes of public routes as public", () => {
    expect(proxy(request("/loginx")).headers.get("location")).toContain(
      "/login"
    )
  })
})
