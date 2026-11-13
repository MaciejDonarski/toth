import type { Meta, StoryObj } from "@storybook/react-vite"

import { Checkbox } from "@toth/ui/components/checkbox"
import { Label } from "@toth/ui/components/label"

const meta = {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
  args: { children: "Accept terms and conditions" },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="label-terms" />
      <Label {...args} htmlFor="label-terms" />
    </div>
  ),
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
