import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import Page from "./page"

vi.mock("@/auth/dal", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", role: "ADMIN" })),
}))

describe("Dashboard page", () => {
  it("renders the hello world greeting", async () => {
    render(await Page())
    expect(screen.getByText("Hello, world!")).toBeInTheDocument()
  })
})
