import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@toth/ui/components/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@toth/ui/components/button-group"
import { Input } from "@toth/ui/components/input"

const meta = {
  title: "UI/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
  },
  args: { orientation: "horizontal" },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline">Archive</Button>
      <Button variant="outline">Report</Button>
      <Button variant="outline">Snooze</Button>
    </ButtonGroup>
  ),
} satisfies Meta<typeof ButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Vertical: Story = { args: { orientation: "vertical" } }
export const SplitButton: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>Deploy</Button>
      <ButtonGroupSeparator />
      <Button size="icon" aria-label="More options">
        <ChevronDownIcon />
      </Button>
    </ButtonGroup>
  ),
}
export const WithInput: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <ButtonGroupText>https://</ButtonGroupText>
      <Input placeholder="example.com" />
      <Button variant="outline">Go</Button>
    </ButtonGroup>
  ),
}
