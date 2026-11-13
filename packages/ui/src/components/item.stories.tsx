import type { Meta, StoryObj } from "@storybook/react-vite"
import { BadgeCheckIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@toth/ui/components/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@toth/ui/components/item"

const meta = {
  title: "UI/Item",
  component: Item,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["default", "outline", "muted"],
    },
    size: { control: "inline-radio", options: ["default", "sm", "xs"] },
  },
  args: { variant: "outline", size: "default" },
  render: (args) => (
    <Item {...args} className="w-96">
      <ItemContent>
        <ItemTitle>Basic Item</ItemTitle>
        <ItemDescription>
          A simple item with title and description.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="outline" size="sm">
          Action
        </Button>
      </ItemActions>
    </Item>
  ),
} satisfies Meta<typeof Item>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Muted: Story = { args: { variant: "muted" } }
export const AsLink: Story = {
  render: (args) => (
    <Item {...args} size="sm" className="w-96" render={<a href="/profile" />}>
      <ItemMedia variant="icon">
        <BadgeCheckIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Your profile has been verified.</ItemTitle>
      </ItemContent>
      <ItemActions>
        <ChevronRightIcon className="size-4" />
      </ItemActions>
    </Item>
  ),
}
export const Group: Story = {
  render: (args) => (
    <ItemGroup className="w-96">
      {["shadcn", "maxleiter", "evilrabbit"].map((name, index) => (
        <div key={name}>
          {index > 0 && <ItemSeparator />}
          <Item {...args} variant="default">
            <ItemContent>
              <ItemTitle>{name}</ItemTitle>
              <ItemDescription>{name}@vercel.com</ItemDescription>
            </ItemContent>
          </Item>
        </div>
      ))}
    </ItemGroup>
  ),
}
