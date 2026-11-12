import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@toth/ui/components/avatar"

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "default", "lg"] },
  },
  args: { size: "default" },
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Fallback: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
}
export const WithBadge: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>AB</AvatarFallback>
      <AvatarBadge className="bg-green-600" />
    </Avatar>
  ),
}
export const Group: Story = {
  render: (args) => (
    <AvatarGroup>
      {["AB", "CD", "EF"].map((initials) => (
        <Avatar key={initials} {...args}>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>+5</AvatarGroupCount>
    </AvatarGroup>
  ),
}
