import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@toth/ui/components/popover"

describe("Popover", () => {
  it("toggles the popover", async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription>Set the dimensions.</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    )
    const trigger = screen.getByRole("button", { name: "Open popover" })
    await user.click(trigger)
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAccessibleName("Dimensions")
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
