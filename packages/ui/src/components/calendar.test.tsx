import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Calendar } from "@toth/ui/components/calendar"

describe("Calendar", () => {
  it("renders the month grid for the given month", () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 0, 1)} />)
    expect(screen.getByRole("grid")).toBeInTheDocument()
    expect(screen.getByText(/January 2026/i)).toBeInTheDocument()
  })

  it("selects a day", async () => {
    const onSelect = vi.fn()
    render(
      <Calendar
        mode="single"
        defaultMonth={new Date(2026, 0, 1)}
        onSelect={onSelect}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: /January 15/i }))
    expect(onSelect).toHaveBeenCalled()
    const selected = onSelect.mock.calls[0]?.[0] as Date
    expect(selected.getDate()).toBe(15)
  })

  it("navigates to the next month", async () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 0, 1)} />)
    await userEvent.click(screen.getByRole("button", { name: /next month/i }))
    expect(screen.getByText(/February 2026/i)).toBeInTheDocument()
  })
})
