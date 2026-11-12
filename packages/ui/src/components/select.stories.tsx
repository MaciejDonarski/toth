import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@toth/ui/components/select"

const fruits = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
]
const vegetables = [
  { label: "Carrot", value: "carrot" },
  { label: "Leek", value: "leek" },
]

const meta = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
  args: { items: [...fruits, ...vegetables] },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-48" aria-label="Food">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          {fruits.map((item) => (
            <SelectItem key={item.label} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          {vegetables.map((item) => (
            <SelectItem key={item.label} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Preselected: Story = { args: { defaultValue: "banana" } }
export const Disabled: Story = { args: { disabled: true } }
