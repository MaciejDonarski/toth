import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Kbd, KbdGroup } from "@toth/ui/components/kbd"

describe("Kbd", () => {
  it("renders keyboard keys in a group", () => {
    render(
      <KbdGroup data-testid="group">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    )
    expect(screen.getByText("⌘").tagName).toBe("KBD")
    expect(screen.getByTestId("group")).toHaveAttribute(
      "data-slot",
      "kbd-group"
    )
  })
})
