import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Toggle, toggleVariants } from "@toth/ui/components/toggle"

describe("Toggle", () => {
  it("toggles pressed state", async () => {
    render(<Toggle aria-label="Bold">B</Toggle>)
    const toggle = screen.getByRole("button", { name: "Bold" })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-pressed", "true")
  })

  it("applies variants", () => {
    render(
      <Toggle variant="outline" size="lg" aria-label="Italic">
        I
      </Toggle>
    )
    expect(screen.getByRole("button")).toHaveClass("border", "h-10")
    expect(toggleVariants({ size: "sm" })).toContain("h-8")
  })
})
