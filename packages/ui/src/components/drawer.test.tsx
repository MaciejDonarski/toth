import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@toth/ui/components/drawer"

describe("Drawer", () => {
  it("opens and closes", async () => {
    const user = userEvent.setup()
    render(
      <Drawer>
        <DrawerTrigger>Open drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Move goal</DrawerTitle>
            <DrawerDescription>Set your daily activity goal.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>Cancel</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
    await user.click(screen.getByRole("button", { name: "Open drawer" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAccessibleName("Move goal")

    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
