import type { Meta, StoryObj } from "@storybook/react-vite"

import { Label } from "@toth/ui/components/label"
import { Switch } from "@toth/ui/components/switch"

const meta = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
  argTypes: { size: { control: "inline-radio", options: ["default", "sm"] } },
  args: { size: "default" },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch {...args} id="switch-airplane" />
      <Label htmlFor="switch-airplane">Airplane mode</Label>
    </div>
  ),
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Checked: Story = { args: { defaultChecked: true } }
export const Small: Story = { args: { size: "sm" } }
export const Disabled: Story = { args: { disabled: true } }
