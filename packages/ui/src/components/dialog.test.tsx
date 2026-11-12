import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@toth/ui/components/dialog"

function Example({ showCloseButton }: { showCloseButton?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger>Edit profile</DialogTrigger>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Make changes to your profile.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe("Dialog", () => {
  it("opens an accessible dialog", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Edit profile" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAccessibleName("Edit profile")
    expect(dialog).toHaveAccessibleDescription("Make changes to your profile.")
  })

  it("closes via the close button and Escape", async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole("button", { name: "Edit profile" }))
    await user.click(await screen.findByRole("button", { name: "Done" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Edit profile" }))
    await screen.findByRole("dialog")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders the built-in close button by default", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Edit profile" }))
    expect(
      await screen.findByRole("button", { name: "Close" })
    ).toBeInTheDocument()
  })

  it("can hide the built-in close button", async () => {
    render(<Example showCloseButton={false} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit profile" }))
    await screen.findByRole("dialog")
    expect(
      screen.queryByRole("button", { name: "Close" })
    ).not.toBeInTheDocument()
  })
})
