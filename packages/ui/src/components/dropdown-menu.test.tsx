import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@toth/ui/components/dropdown-menu"

describe("DropdownMenu", () => {
  it("opens the menu and selects an item", async () => {
    const user = userEvent.setup()
    const onProfile = vi.fn()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem onClick={onProfile}>Profile</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value="top">
            <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    await user.click(screen.getByRole("button", { name: "Open" }))
    expect(await screen.findByRole("menu")).toBeInTheDocument()
    expect(screen.getByRole("menuitemradio", { name: "Top" })).toHaveAttribute(
      "aria-checked",
      "true"
    )
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-variant",
      "destructive"
    )
    await user.click(screen.getByRole("menuitem", { name: "Profile" }))
    expect(onProfile).toHaveBeenCalledTimes(1)
  })
})
