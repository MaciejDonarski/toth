import { render, screen } from "@test/render"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AdminBreadcrumbs } from "./admin-breadcrumbs"

const pathname = vi.hoisted(() => ({ current: "/users" }))

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

describe("AdminBreadcrumbs", () => {
  beforeEach(() => {
    pathname.current = "/users"
  })

  it("shows the nav group and the current page", () => {
    render(<AdminBreadcrumbs />)
    expect(screen.getByText("Zarządzanie")).toBeInTheDocument()
    expect(screen.getByText("Użytkownicy")).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("matches nested paths to their nav item", () => {
    pathname.current = "/settings/billing"
    render(<AdminBreadcrumbs />)
    expect(screen.getByText("Ustawienia")).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("renders nothing for unknown paths", () => {
    pathname.current = "/unknown"
    const { container } = render(<AdminBreadcrumbs />)
    expect(container).toBeEmptyDOMElement()
  })
})
