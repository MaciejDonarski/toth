import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@toth/ui/components/input-group"

describe("InputGroup", () => {
  it("renders input with addons and button", async () => {
    const onSearch = vi.fn()
    render(
      <InputGroup>
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton onClick={onSearch}>Search</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    )
    const [group] = screen.getAllByRole("group")
    expect(group).toHaveAttribute("data-slot", "input-group")
    const input = screen.getByPlaceholderText("Search...")
    await userEvent.type(input, "hello")
    expect(input).toHaveValue("hello")
    expect(screen.getByText("https://")).toBeInTheDocument()

    const button = screen.getByRole("button", { name: "Search" })
    expect(button).toHaveAttribute("type", "button")
    await userEvent.click(button)
    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it("renders a textarea variant", () => {
    render(
      <InputGroup>
        <InputGroupTextarea placeholder="Write..." />
      </InputGroup>
    )
    expect(screen.getByPlaceholderText("Write...").tagName).toBe("TEXTAREA")
  })

  it("focuses the input when clicking an addon", async () => {
    render(
      <InputGroup>
        <InputGroupInput placeholder="Message" />
        <InputGroupAddon align="block-end" data-testid="addon">
          tip
        </InputGroupAddon>
      </InputGroup>
    )
    await userEvent.click(screen.getByTestId("addon"))
    expect(screen.getByPlaceholderText("Message")).toHaveFocus()
  })
})
