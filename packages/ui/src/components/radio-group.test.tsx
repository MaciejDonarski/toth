import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Label } from "@toth/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@toth/ui/components/radio-group"

describe("RadioGroup", () => {
  it("selects one option at a time", async () => {
    const onValueChange = vi.fn()
    render(
      <RadioGroup
        defaultValue="comfortable"
        onValueChange={onValueChange}
        aria-label="Density"
      >
        <Label>
          <RadioGroupItem value="default" /> Default
        </Label>
        <Label>
          <RadioGroupItem value="comfortable" /> Comfortable
        </Label>
      </RadioGroup>
    )
    expect(
      screen.getByRole("radiogroup", { name: "Density" })
    ).toBeInTheDocument()
    const [first, second] = screen.getAllByRole("radio")
    expect(second).toHaveAttribute("aria-checked", "true")

    await userEvent.click(first!)
    expect(first).toHaveAttribute("aria-checked", "true")
    expect(second).toHaveAttribute("aria-checked", "false")
    expect(onValueChange).toHaveBeenCalledWith("default", expect.anything())
  })
})
