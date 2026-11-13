import type { Meta, StoryObj } from "@storybook/react-vite"
import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@toth/ui/components/toggle-group"

const meta = {
  title: "UI/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "outline"] },
    size: { control: "inline-radio", options: ["default", "sm", "lg"] },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    spacing: { control: { type: "number", min: 0, max: 4 } },
  },
  args: { variant: "outline", size: "default", spacing: 0, multiple: true },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <ItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Toggle underline">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Single: Story = { args: { multiple: false } }
export const Spaced: Story = { args: { spacing: 2, variant: "default" } }
export const Vertical: Story = { args: { orientation: "vertical" } }
