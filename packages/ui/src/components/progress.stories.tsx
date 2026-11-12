import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@toth/ui/components/progress"

const meta = {
  title: "UI/Progress",
  component: Progress,
  tags: ["autodocs"],
  args: { value: 60 },
  argTypes: { value: { control: { type: "range", min: 0, max: 100 } } },
  render: (args) => (
    <Progress {...args} className="w-72" aria-label="Progress" />
  ),
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithLabel: Story = {
  render: (args) => (
    <Progress {...args} className="w-72">
      <ProgressLabel>Upload progress</ProgressLabel>
      <ProgressValue />
    </Progress>
  ),
}
export const Indeterminate: Story = { args: { value: null } }
