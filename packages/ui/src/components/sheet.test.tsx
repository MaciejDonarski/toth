import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@toth/ui/components/sheet"

describe("Sheet", () => {
  it("opens from the chosen side and closes", async () => {
    const user = userEvent.setup()
    render(
      <Sheet>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>Make changes here.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Save</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
    await user.click(screen.getByRole("button", { name: "Open sheet" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAccessibleName("Edit profile")
    expect(dialog).toHaveAttribute("data-side", "left")
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
