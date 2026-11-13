import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Button } from "@toth/ui/components/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@toth/ui/components/button-group"

describe("ButtonGroup", () => {
  it("renders a group with buttons, text and separator", () => {
    render(
      <ButtonGroup aria-label="Actions">
        <ButtonGroupText>Label</ButtonGroupText>
        <Button>One</Button>
        <ButtonGroupSeparator />
        <Button>Two</Button>
      </ButtonGroup>
    )
    const group = screen.getByRole("group", { name: "Actions" })
    expect(group).toHaveAttribute("data-slot", "button-group")
    expect(screen.getAllByRole("button")).toHaveLength(2)
    expect(screen.getByText("Label")).toBeInTheDocument()
  })

  it("supports vertical orientation", () => {
    render(<ButtonGroup orientation="vertical" />)
    expect(screen.getByRole("group")).toHaveAttribute(
      "data-orientation",
      "vertical"
    )
  })
})
