import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Slider } from "@toth/ui/components/slider"

// Base UI keeps thumbs `visibility: hidden` until they are measured. jsdom has
// no layout, so the queries opt into hidden elements.
describe("Slider", () => {
  it("renders a thumb per value", () => {
    render(<Slider defaultValue={[25, 75]} aria-label="Range" />)
    expect(screen.getAllByRole("slider", { hidden: true })).toHaveLength(2)
  })

  it("changes the value with the keyboard", async () => {
    const onValueChange = vi.fn()
    render(
      <Slider defaultValue={[50]} step={10} onValueChange={onValueChange} />
    )
    const slider = screen.getByRole("slider", { hidden: true })
    expect(slider).toHaveAttribute("aria-valuenow", "50")
    slider.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(slider).toHaveAttribute("aria-valuenow", "60")
    expect(onValueChange).toHaveBeenCalled()
  })
})
