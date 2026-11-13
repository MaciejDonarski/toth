import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowRightIcon, Loader2Icon, PlusIcon } from "lucide-react"
import { fn } from "storybook/test"

import { Button } from "@toth/ui/components/button"

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "outline",
        "ghost",
        "destructive",
        "link",
      ],
    },
    size: {
      control: "select",
      options: [
        "default",
        "xs",
        "sm",
        "lg",
        "icon",
        "icon-xs",
        "icon-sm",
        "icon-lg",
      ],
    },
  },
  args: {
    children: "Button",
    variant: "default",
    size: "default",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { variant: "secondary" } }
export const Outline: Story = { args: { variant: "outline" } }
export const Ghost: Story = { args: { variant: "ghost" } }
export const Destructive: Story = { args: { variant: "destructive" } }
export const Link: Story = { args: { variant: "link" } }
export const Disabled: Story = { args: { disabled: true } }
export const WithIcon: Story = {
  args: {
    children: (
      <>
        Continue <ArrowRightIcon data-icon="inline-end" />
      </>
    ),
  },
}
export const Icon: Story = {
  args: {
    size: "icon",
    "aria-label": "Add",
    children: <PlusIcon />,
    variant: "outline",
  },
}
export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Loader2Icon className="animate-spin" data-icon="inline-start" /> Please
        wait
      </>
    ),
  },
}
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      {(["xs", "sm", "default", "lg"] as const).map((size) => (
        <Button key={size} {...args} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
}
