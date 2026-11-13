import { render, screen } from "@test/render"
import { describe, expect, it, vi } from "vitest"

import Page from "./page"

vi.mock("@/auth/dal", () => ({
  requirePermission: vi.fn(async () => ({
    id: "u1",
    role: "ADMIN",
    name: "Anna",
    email: "anna@firma.pl",
  })),
}))
vi.mock("next-intl/server", async () =>
  (await import("@test/intl-server")).intlServerMock()
)

describe("Dashboard page", () => {
  it("greets the signed-in user", async () => {
    render(await Page())
    expect(screen.getByText("Cześć, Anna!")).toBeInTheDocument()
  })
})
