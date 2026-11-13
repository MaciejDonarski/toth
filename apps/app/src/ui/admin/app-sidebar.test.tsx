import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@toth/ui/components/sidebar"

import { AppSidebar } from "./app-sidebar"

vi.mock("next/navigation", () => ({ usePathname: () => "/users" }))

describe("AppSidebar", () => {
  it("renders the logo, grouped navigation and separators", () => {
    const { container } = render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    )
    expect(screen.getByText("Toth")).toBeInTheDocument()
    expect(screen.getByText("Overview")).toBeInTheDocument()
    expect(screen.getByText("Management")).toBeInTheDocument()
    expect(
      container.querySelectorAll("[data-slot=sidebar-separator]")
    ).toHaveLength(1)
  })

  it("marks the link for the current path as active", () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    )
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "data-active"
    )
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "data-active"
    )
  })
})
