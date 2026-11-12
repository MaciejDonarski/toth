import { redirect } from "next/navigation"
import { describe, expect, it, vi } from "vitest"

import Page from "./page"

vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

describe("Root page", () => {
  it("redirects to the dashboard", () => {
    Page()
    expect(redirect).toHaveBeenCalledWith("/dashboard")
  })
})
