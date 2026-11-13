import { render, screen } from "@testing-library/react"
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
    const trigger = screen.getByRole("button", { name: /account menu/i })
    expect(trigger).toHaveTextContent("JD")
    expect(trigger).toHaveTextContent("Jane Doe")
    expect(trigger).toHaveTextContent("jane@example.com")
  })

  it("toggles from light to dark mode", async () => {
    const u = userEvent.setup()
    render(<UserMenu user={user} onLogout={vi.fn()} />)
    await u.click(screen.getByRole("button", { name: /account menu/i }))
    await u.click(await screen.findByRole("menuitem", { name: "Dark mode" }))
    expect(theme.setTheme).toHaveBeenCalledWith("dark")
  })

  it("toggles from dark to light mode", async () => {
    theme.resolvedTheme = "dark"
    const u = userEvent.setup()
    render(<UserMenu user={user} onLogout={vi.fn()} />)
    await u.click(screen.getByRole("button", { name: /account menu/i }))
    await u.click(await screen.findByRole("menuitem", { name: "Light mode" }))
    expect(theme.setTheme).toHaveBeenCalledWith("light")
  })

  it("calls the logout action", async () => {
    const onLogout = vi.fn().mockResolvedValue(undefined)
    const u = userEvent.setup()
    render(<UserMenu user={user} onLogout={onLogout} />)
    await u.click(screen.getByRole("button", { name: /account menu/i }))
    await u.click(await screen.findByRole("menuitem", { name: "Log out" }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
