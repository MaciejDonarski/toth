import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@toth/ui/components/native-select"

const meta = {
  title: "UI/NativeSelect",
  component: NativeSelect,
  tags: ["autodocs"],
  argTypes: { size: { control: "inline-radio", options: ["default", "sm"] } },
  args: { size: "default", defaultValue: "" },
  render: (args) => (
    <NativeSelect {...args} aria-label="Status">
      <NativeSelectOption value="">Select status</NativeSelectOption>
      <NativeSelectOptGroup label="Open">
        <NativeSelectOption value="todo">Todo</NativeSelectOption>
        <NativeSelectOption value="in-progress">In progress</NativeSelectOption>
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="Closed">
        <NativeSelectOption value="done">Done</NativeSelectOption>
        <NativeSelectOption value="cancelled">Cancelled</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  ),
} satisfies Meta<typeof NativeSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Small: Story = { args: { size: "sm" } }
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { "aria-invalid": true } }
