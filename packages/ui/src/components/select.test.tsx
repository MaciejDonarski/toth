import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@toth/ui/components/select"

const items = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
]

describe("Select", () => {
  it("opens and selects an option", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Select items={items} onValueChange={onValueChange}>
        <SelectTrigger aria-label="Fruit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            {items.map((item) => (
              <SelectItem key={item.label} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
    const trigger = screen.getByRole("combobox", { name: "Fruit" })
    expect(trigger).toHaveTextContent("Select a fruit")

    await user.click(trigger)
    await user.click(await screen.findByRole("option", { name: "Banana" }))
    expect(onValueChange).toHaveBeenCalledWith("banana", expect.anything())
    expect(trigger).toHaveTextContent("Banana")
  })

  it("supports small trigger size", () => {
    render(
      <Select>
        <SelectTrigger size="sm" aria-label="Small">
          <SelectValue />
        </SelectTrigger>
      </Select>
    )
    expect(screen.getByRole("combobox", { name: "Small" })).toHaveAttribute(
      "data-size",
      "sm"
    )
  })
})
