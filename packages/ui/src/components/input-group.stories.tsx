import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowUpIcon, SearchIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@toth/ui/components/input-group"

const meta = {
  title: "UI/InputGroup",
  component: InputGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Search: Story = {
  render: (args) => (
    <InputGroup {...args} className="w-80">
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
    </InputGroup>
  ),
}

export const Url: Story = {
  render: (args) => (
    <InputGroup {...args} className="w-80">
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>.com</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const Prompt: Story = {
  render: (args) => (
    <InputGroup {...args} className="w-96">
      <InputGroupTextarea placeholder="Ask, search or chat..." />
      <InputGroupAddon align="block-end">
        <InputGroupText className="ml-auto">52% used</InputGroupText>
        <InputGroupButton variant="default" size="icon-xs" aria-label="Send">
          <ArrowUpIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}
