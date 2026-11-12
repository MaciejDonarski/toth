import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@toth/ui/components/menubar"

describe("Menubar", () => {
  it("opens a menu and activates an item", async () => {
    const user = userEvent.setup()
    const onNewTab = vi.fn()
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onNewTab}>
              New Tab <MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Print</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Undo</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )
    expect(screen.getByRole("menubar")).toBeInTheDocument()
    await user.click(screen.getByRole("menuitem", { name: "File" }))
    expect(await screen.findByRole("menu")).toBeInTheDocument()
    await user.click(screen.getByRole("menuitem", { name: /new tab/i }))
    expect(onNewTab).toHaveBeenCalledTimes(1)
  })
})
