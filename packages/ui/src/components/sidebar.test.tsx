import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@toth/ui/components/sidebar"

function Example() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>Acme</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive>Home</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>Settings</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>v1.0</SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <p>Main content</p>
      </SidebarInset>
    </SidebarProvider>
  )
}

describe("Sidebar", () => {
  it("renders menu items and marks the active one", () => {
    render(<Example />)
    expect(screen.getByText("Application")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "data-active"
    )
    expect(screen.getByText("Main content")).toBeInTheDocument()
  })

  it("collapses and expands with the trigger", async () => {
    const user = userEvent.setup()
    const { container } = render(<Example />)
    const sidebar = () => container.querySelector("[data-slot=sidebar]")
    expect(sidebar()).toHaveAttribute("data-state", "expanded")

    await user.click(screen.getByRole("button", { name: /toggle sidebar/i }))
    expect(sidebar()).toHaveAttribute("data-state", "collapsed")
  })

  it("toggles with the keyboard shortcut", async () => {
    const user = userEvent.setup()
    const { container } = render(<Example />)
    await user.keyboard("{Control>}b{/Control}")
    expect(container.querySelector("[data-slot=sidebar]")).toHaveAttribute(
      "data-state",
      "collapsed"
    )
  })
})
