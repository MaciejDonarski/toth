import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@toth/ui/components/context-menu"

describe("ContextMenu", () => {
  it("opens on right click and triggers item", async () => {
    const onBack = vi.fn()
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right click here</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onBack}>
            Back <ContextMenuShortcut>⌘[</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked>
            Show bookmarks
          </ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>
    )
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    fireEvent.contextMenu(screen.getByText("Right click here"))

    expect(await screen.findByRole("menu")).toBeInTheDocument()
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Show bookmarks" })
    ).toHaveAttribute("aria-checked", "true")
    await userEvent.click(screen.getByRole("menuitem", { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
