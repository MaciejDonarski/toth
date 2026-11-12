import type { Meta, StoryObj } from "@storybook/react-vite"

import { Textarea } from "@toth/ui/components/textarea"

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: {
    placeholder: "Type your message here.",
    className: "w-80",
    "aria-label": "Message",
  },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { "aria-invalid": true } }
