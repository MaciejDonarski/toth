import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import { Input } from "@toth/ui/components/input"
import { Label } from "@toth/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@toth/ui/components/popover"

const meta = {
  title: "UI/Popover",
  component: Popover,
  tags: ["autodocs"],
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Open popover
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>
            Set the dimensions for the layer.
          </PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-2">
          {["Width", "Height"].map((label) => (
            <div key={label} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={`popover-${label}`}>{label}</Label>
              <Input
                id={`popover-${label}`}
                defaultValue="100%"
                className="col-span-2 h-8"
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  ),
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Open: Story = { args: { defaultOpen: true } }
