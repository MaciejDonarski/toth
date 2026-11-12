import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@toth/ui/components/navigation-menu"

describe("NavigationMenu", () => {
  it("renders navigation and opens a submenu", async () => {
    const user = userEvent.setup()
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/docs">Introduction</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="/about"
              className={navigationMenuTriggerStyle()}
            >
              About
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    )
    expect(screen.getByRole("navigation")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about"
    )

    const trigger = screen.getByRole("button", { name: /getting started/i })
    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(
      await screen.findByRole("link", { name: "Introduction" })
    ).toBeInTheDocument()
  })
})
