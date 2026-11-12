import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ToggleGroup, ToggleGroupItem } from "@toth/ui/components/toggle-group"

describe("ToggleGroup", () => {
  it("allows a single pressed item by default", async () => {
    render(
      <ToggleGroup variant="outline" aria-label="Text alignment">
        <ToggleGroupItem value="left">Left</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
      </ToggleGroup>
    )
    const left = screen.getByRole("button", { name: "Left" })
    const center = screen.getByRole("button", { name: "Center" })
    await userEvent.click(left)
    expect(left).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(center)
    expect(center).toHaveAttribute("aria-pressed", "true")
    expect(left).toHaveAttribute("aria-pressed", "false")
    expect(left).toHaveAttribute("data-variant", "outline")
  })

  it("allows multiple pressed items", async () => {
    render(
      <ToggleGroup multiple>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>
    )
    await userEvent.click(screen.getByRole("button", { name: "Bold" }))
    await userEvent.click(screen.getByRole("button", { name: "Italic" }))
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: "Italic" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })
})
