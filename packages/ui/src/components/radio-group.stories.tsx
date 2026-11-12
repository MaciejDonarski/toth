import type { Meta, StoryObj } from "@storybook/react-vite"

import { Label } from "@toth/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@toth/ui/components/radio-group"

const options = [
  { value: "default", label: "Default" },
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
]

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  args: { defaultValue: "comfortable" },
  render: (args) => (
    <RadioGroup {...args} aria-label="Density">
      {options.map((option) => (
        <div key={option.value} className="flex items-center gap-3">
          <RadioGroupItem value={option.value} id={`radio-${option.value}`} />
          <Label htmlFor={`radio-${option.value}`}>{option.label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
