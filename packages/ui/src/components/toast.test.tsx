import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Toaster, createToastManager } from "@toth/ui/components/toast"

describe("Toaster", () => {
  it("exposes a polite live region", () => {
    render(<Toaster toastManager={createToastManager()} />)
    expect(
      screen.getByRole("region", { name: "Notifications" })
    ).toHaveAttribute("aria-live", "polite")
  })

  it("shows a toast added through the manager and closes it", async () => {
    const user = userEvent.setup()
    const manager = createToastManager()
    render(<Toaster toastManager={manager} />)

    act(() => {
      manager.add({
        title: "Event created",
        description: "Sunday, December 03",
        type: "success",
      })
    })
    expect(await screen.findByText("Event created")).toBeInTheDocument()
    expect(screen.getByText("Sunday, December 03")).toBeInTheDocument()

    // Base UI hides the close button from assistive tech until the stack is expanded
    const close = document.querySelector<HTMLButtonElement>(
      "[data-slot=toast-close]"
    )
    expect(close).toHaveAttribute("aria-label", "Close toast")
    await user.click(close!)
    await waitFor(() =>
      expect(screen.queryByText("Event created")).not.toBeInTheDocument()
    )
  })
})
