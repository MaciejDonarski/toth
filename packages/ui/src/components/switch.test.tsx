import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Switch } from "@toth/ui/components/switch"

describe("Switch", () => {
  it("toggles on click", async () => {
    const onCheckedChange = vi.fn()
    render(
      <Switch aria-label="Airplane mode" onCheckedChange={onCheckedChange} />
    )
    const sw = screen.getByRole("switch", { name: "Airplane mode" })
    expect(sw).toHaveAttribute("aria-checked", "false")
    await userEvent.click(sw)
    expect(sw).toHaveAttribute("aria-checked", "true")
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything())
  })

  it("supports size and disabled", async () => {
    render(<Switch aria-label="Small" size="sm" disabled />)
    const sw = screen.getByRole("switch", { name: "Small" })
    expect(sw).toHaveAttribute("data-size", "sm")
    await userEvent.click(sw)
    expect(sw).toHaveAttribute("aria-checked", "false")
  })
})
