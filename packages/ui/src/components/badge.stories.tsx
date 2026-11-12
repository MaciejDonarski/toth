import type { Meta, StoryObj } from "@storybook/react-vite"
import { BadgeCheckIcon } from "lucide-react"

import { Badge } from "@toth/ui/components/badge"

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "ghost",
        "link",
      ],
    },
  },
  args: { children: "Badge", variant: "default" },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { variant: "secondary" } }
export const Destructive: Story = { args: { variant: "destructive" } }
export const Outline: Story = { args: { variant: "outline" } }
export const WithIcon: Story = {
  args: {
    variant: "secondary",
    children: (
      <>
        <BadgeCheckIcon /> Verified
      </>
    ),
  },
}
export const AsLink: Story = {
  args: { render: <a href="/docs" />, children: "Link badge" },
}
