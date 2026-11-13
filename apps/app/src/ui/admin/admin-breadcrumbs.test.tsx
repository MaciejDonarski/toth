import { render, screen } from "@testing-library/react"
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
    expect(screen.getByText("Management")).toBeInTheDocument()
    expect(screen.getByText("Users")).toHaveAttribute("aria-current", "page")
  })

  it("matches nested paths to their nav item", () => {
    pathname.current = "/settings/billing"
    render(<AdminBreadcrumbs />)
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page")
  })

  it("renders nothing for unknown paths", () => {
    pathname.current = "/unknown"
    const { container } = render(<AdminBreadcrumbs />)
    expect(container).toBeEmptyDOMElement()
  })
})
