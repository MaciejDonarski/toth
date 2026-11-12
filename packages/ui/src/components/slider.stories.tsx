import type { Meta, StoryObj } from "@storybook/react-vite"

import { Slider } from "@toth/ui/components/slider"

const meta = {
  title: "UI/Slider",
  component: Slider,
  tags: ["autodocs"],
  args: { defaultValue: [50], max: 100, step: 1 },
  render: (args) => <Slider {...args} className="w-72" aria-label="Volume" />,
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Range: Story = { args: { defaultValue: [25, 75] } }
export const Stepped: Story = { args: { step: 10 } }
export const Disabled: Story = { args: { disabled: true } }
export const Vertical: Story = {
  render: (args) => (
    <div className="h-48">
      <Slider {...args} orientation="vertical" aria-label="Volume" />
    </div>
  ),
}
