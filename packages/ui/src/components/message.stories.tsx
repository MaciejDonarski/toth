import type { Meta, StoryObj } from "@storybook/react-vite"

import { Avatar, AvatarFallback } from "@toth/ui/components/avatar"
import { Bubble, BubbleContent } from "@toth/ui/components/bubble"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@toth/ui/components/message"

const meta = {
  title: "UI/Message",
  component: Message,
  tags: ["autodocs"],
  argTypes: { align: { control: "inline-radio", options: ["start", "end"] } },
  args: { align: "start" },
  render: (args) => (
    <div className="w-[28rem]">
      <Message {...args}>
        <MessageAvatar>
          <Avatar size="sm">
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>Jane Doe · 10:42</MessageHeader>
          <Bubble
            align={args.align}
            variant={args.align === "end" ? "default" : "muted"}
          >
            <BubbleContent>Can you share the latest designs?</BubbleContent>
          </Bubble>
          <MessageFooter>Delivered</MessageFooter>
        </MessageContent>
      </Message>
    </div>
  ),
} satisfies Meta<typeof Message>

export default meta
type Story = StoryObj<typeof meta>

export const Incoming: Story = {}
export const Outgoing: Story = { args: { align: "end" } }
export const Conversation: Story = {
  render: () => (
    <MessageGroup className="w-[28rem]">
      <Message>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>Deploy is done ✅</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageContent>
          <Bubble align="end">
            <BubbleContent>Thanks! Checking now.</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </MessageGroup>
  ),
}
