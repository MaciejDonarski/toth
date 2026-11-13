import type { Meta, StoryObj } from "@storybook/react-vite"

import { Input } from "@toth/ui/components/input"
import { Label } from "@toth/ui/components/label"

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "file", "search"],
    },
  },
  args: { type: "email", placeholder: "Email", className: "w-72" },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "not-an-email" },
}
export const File: Story = { args: { type: "file", placeholder: undefined } }
export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="input-email">Email</Label>
      <Input {...args} id="input-email" />
    </div>
  ),
}
