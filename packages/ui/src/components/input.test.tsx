import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Input } from "@toth/ui/components/input"

describe("Input", () => {
  it("accepts typing", async () => {
    render(<Input aria-label="Email" type="email" />)
    const input = screen.getByRole("textbox", { name: "Email" })
    expect(input).toHaveAttribute("type", "email")
    expect(input).toHaveAttribute("data-slot", "input")
    await userEvent.type(input, "a@b.co")
    expect(input).toHaveValue("a@b.co")
  })

  it("can be disabled and marked invalid", () => {
    render(<Input aria-label="Name" disabled aria-invalid />)
    const input = screen.getByRole("textbox", { name: "Name" })
    expect(input).toBeDisabled()
    expect(input).toBeInvalid()
  })
})
