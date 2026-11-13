import type { Meta, StoryObj } from "@storybook/react-vite"

import { Checkbox } from "@toth/ui/components/checkbox"
import { Label } from "@toth/ui/components/label"

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  render: (args) => (
    <Label className="flex items-center gap-2">
      <Checkbox {...args} />
      Accept terms and conditions
    </Label>
  ),
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Checked: Story = { args: { defaultChecked: true } }
export const Indeterminate: Story = { args: { indeterminate: true } }
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { "aria-invalid": true } }
