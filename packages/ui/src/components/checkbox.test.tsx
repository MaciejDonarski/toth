import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Checkbox } from "@toth/ui/components/checkbox"

describe("Checkbox", () => {
  it("toggles checked state on click", async () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox aria-label="Accept" onCheckedChange={onCheckedChange} />)
    const checkbox = screen.getByRole("checkbox", { name: "Accept" })
    expect(checkbox).toHaveAttribute("aria-checked", "false")
    await userEvent.click(checkbox)
    expect(checkbox).toHaveAttribute("aria-checked", "true")
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything())
  })

  it("does not toggle when disabled", async () => {
    render(<Checkbox aria-label="Accept" disabled />)
    const checkbox = screen.getByRole("checkbox", { name: "Accept" })
    await userEvent.click(checkbox)
    expect(checkbox).toHaveAttribute("aria-checked", "false")
  })
})
