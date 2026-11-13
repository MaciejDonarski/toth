import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@toth/ui/components/command"

function Example({ onSelect }: { onSelect?: (v: string) => void }) {
  return (
    <Command>
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={onSelect}>Calendar</CommandItem>
          <CommandItem onSelect={onSelect}>
            Settings <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </Command>
  )
}

describe("Command", () => {
  it("lists items and filters them by query", async () => {
    render(<Example />)
    expect(screen.getAllByRole("option")).toHaveLength(2)
    await userEvent.type(
      screen.getByPlaceholderText("Type a command..."),
      "cal"
    )
    expect(screen.getAllByRole("option")).toHaveLength(1)
    expect(screen.getByRole("option")).toHaveTextContent("Calendar")
  })

  it("shows the empty state", async () => {
    render(<Example />)
    await userEvent.type(
      screen.getByPlaceholderText("Type a command..."),
      "xyz"
    )
    expect(screen.getByText("No results found.")).toBeInTheDocument()
  })

  it("calls onSelect", async () => {
    const onSelect = vi.fn()
    render(<Example onSelect={onSelect} />)
    await userEvent.click(screen.getByRole("option", { name: "Calendar" }))
    expect(onSelect).toHaveBeenCalledWith("Calendar")
  })
})
