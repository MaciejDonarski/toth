import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@toth/ui/components/breadcrumb"

describe("Breadcrumb", () => {
  it("renders an accessible breadcrumb navigation", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    const nav = screen.getByRole("navigation", { name: "breadcrumb" })
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page")
    expect(screen.getByText("More")).toBeInTheDocument()
  })
})
