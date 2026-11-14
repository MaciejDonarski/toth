import { render, screen } from "@test/render"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { UserMenu } from "./user-menu"

const theme = vi.hoisted(() => ({
  resolvedTheme: "light",
  setTheme: vi.fn(),
}))

vi.mock("next-themes", () => ({ useTheme: () => theme }))

const user = { name: "Jane Doe", email: "jane@example.com" }

describe("UserMenu", () => {
  beforeEach(() => {
    theme.resolvedTheme = "light"
    theme.setTheme.mockClear()
  })

  it("shows the user's initials, name and email", () => {
    render(<UserMenu user={user} onLogout={vi.fn()} />)
    const trigger = screen.getByRole("button", { name: /Menu konta/ })
    expect(trigger).toHaveTextContent("JD")
    expect(trigger).toHaveTextContent("Jane Doe")
    expect(trigger).toHaveTextContent("jane@example.com")
  })

  it("switches to dark mode without closing the menu", async () => {
    const u = userEvent.setup()
    render(<UserMenu user={user} onLogout={vi.fn()} />)
    await u.click(screen.getByRole("button", { name: /Menu konta/ }))
    const row = await screen.findByRole("menuitemcheckbox", {
      name: "Tryb ciemny",
    })
    expect(row).toHaveAttribute("aria-checked", "false")
    await u.click(row)
    expect(theme.setTheme).toHaveBeenCalledWith("dark")
    // The menu stays open so the switch visibly flips.
    expect(screen.getByRole("menu")).toBeInTheDocument()
  })

  it("switches back to light mode", async () => {
    theme.resolvedTheme = "dark"
    const u = userEvent.setup()
    render(<UserMenu user={user} onLogout={vi.fn()} />)
    await u.click(screen.getByRole("button", { name: /Menu konta/ }))
    const row = await screen.findByRole("menuitemcheckbox", {
      name: "Tryb ciemny",
    })
    expect(row).toHaveAttribute("aria-checked", "true")
    await u.click(row)
    expect(theme.setTheme).toHaveBeenCalledWith("light")
  })

  it("calls the logout action", async () => {
    const onLogout = vi.fn().mockResolvedValue(undefined)
    const u = userEvent.setup()
    render(<UserMenu user={user} onLogout={onLogout} />)
    await u.click(screen.getByRole("button", { name: /Menu konta/ }))
    await u.click(await screen.findByRole("menuitem", { name: "Wyloguj" }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
