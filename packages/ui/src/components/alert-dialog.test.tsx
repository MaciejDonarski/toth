import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@toth/ui/components/alert-dialog"

function Example({ onConfirm }: { onConfirm?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

describe("AlertDialog", () => {
  it("is closed by default", () => {
    render(<Example />)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("opens with title and description and closes on cancel", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveAccessibleName("Are you sure?")
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.")

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("calls the action handler", async () => {
    const onConfirm = vi.fn()
    render(<Example onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    await userEvent.click(
      await screen.findByRole("button", { name: "Continue" })
    )
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
