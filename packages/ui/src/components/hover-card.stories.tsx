import type { Meta, StoryObj } from "@storybook/react-vite"

import { Avatar, AvatarFallback, AvatarImage } from "@toth/ui/components/avatar"
import { Button } from "@toth/ui/components/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@toth/ui/components/hover-card"

const meta = {
  title: "UI/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
  render: (args) => (
    <HoverCard {...args}>
      <HoverCardTrigger render={<Button variant="link" />}>
        @nextjs
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src="https://github.com/vercel.png" alt="@vercel" />
            <AvatarFallback>VC</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold">@nextjs</h4>
            <p className="text-sm">
              The React Framework – created and maintained by @vercel.
            </p>
            <div className="text-xs text-muted-foreground">
              Joined December 2021
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
} satisfies Meta<typeof HoverCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Open: Story = { args: { defaultOpen: true } }
