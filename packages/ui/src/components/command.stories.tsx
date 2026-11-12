import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import {
  CalculatorIcon,
  CalendarIcon,
  SettingsIcon,
  SmileIcon,
  UserIcon,
} from "lucide-react"

import { Button } from "@toth/ui/components/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@toth/ui/components/command"

function Items() {
  return (
    <>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem>
          <CalendarIcon /> Calendar
        </CommandItem>
        <CommandItem>
          <SmileIcon /> Search Emoji
        </CommandItem>
        <CommandItem disabled>
          <CalculatorIcon /> Calculator
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem>
          <UserIcon /> Profile <CommandShortcut>⌘P</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <SettingsIcon /> Settings <CommandShortcut>⌘S</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </>
  )
}

const meta = {
  title: "UI/Command",
  component: Command,
  tags: ["autodocs"],
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Command {...args} className="w-96 rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <Items />
      </CommandList>
    </Command>
  ),
}

function DialogDemo() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <Items />
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

export const Dialog: Story = { render: () => <DialogDemo /> }
