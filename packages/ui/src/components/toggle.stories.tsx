import type { Meta, StoryObj } from "@storybook/react-vite"
import { BookmarkIcon, ItalicIcon } from "lucide-react"

import { Toggle } from "@toth/ui/components/toggle"

const meta = {
  title: "UI/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "outline"] },
    size: { control: "inline-radio", options: ["default", "sm", "lg"] },
  },
  args: {
    variant: "default",
    size: "default",
    "aria-label": "Toggle italic",
    children: <ItalicIcon />,
  },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Outline: Story = { args: { variant: "outline" } }
export const WithText: Story = {
  args: {
    variant: "outline",
    "aria-label": undefined,
    children: (
      <>
        <BookmarkIcon /> Bookmark
      </>
    ),
  },
}
export const Pressed: Story = { args: { defaultPressed: true } }
export const Disabled: Story = { args: { disabled: true } }
