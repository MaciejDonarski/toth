import { render, screen } from "@test/render"
import { describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@toth/ui/components/sidebar"

import { permissionsFor } from "@/core/auth/domain/permissions"

import { AppSidebar } from "./app-sidebar"

vi.mock("next/navigation", () => ({ usePathname: () => "/users" }))

function renderSidebar(role: "ADMIN" | "MANAGER" | "WORKER" = "ADMIN") {
  return render(
    <SidebarProvider>
      <AppSidebar permissions={permissionsFor(role)} />
    </SidebarProvider>
  )
}

describe("AppSidebar", () => {
  it("renders the logo, grouped navigation and separators", () => {
    const { container } = renderSidebar()
    expect(screen.getByText("Toth")).toBeInTheDocument()
    expect(screen.getByText("Przegląd")).toBeInTheDocument()
    expect(screen.getByText("Zarządzanie")).toBeInTheDocument()
    expect(
      container.querySelectorAll("[data-slot=sidebar-separator]")
    ).toHaveLength(1)
  })

  it("marks the link for the current path as active", () => {
    renderSidebar()
    expect(screen.getByRole("link", { name: "Użytkownicy" })).toHaveAttribute(
      "data-active"
    )
    expect(screen.getByRole("link", { name: "Pulpit" })).not.toHaveAttribute(
      "data-active"
    )
  })

  it("shows a worker only what a worker may open", () => {
    const { container } = renderSidebar("WORKER")
    expect(screen.getByRole("link", { name: "Pulpit" })).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "Użytkownicy" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "Ustawienia" })
    ).not.toBeInTheDocument()
    // The emptied group and its separator disappear too.
    expect(screen.queryByText("Zarządzanie")).not.toBeInTheDocument()
    expect(
      container.querySelectorAll("[data-slot=sidebar-separator]")
    ).toHaveLength(0)
  })
})
