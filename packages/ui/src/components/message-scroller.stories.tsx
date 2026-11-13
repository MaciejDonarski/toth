import type { Meta, StoryObj } from "@storybook/react-vite"

import { Bubble, BubbleContent } from "@toth/ui/components/bubble"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@toth/ui/components/message-scroller"

const messages = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  mine: i % 2 === 1,
  text:
    i % 2 === 1 ? `Reply #${i}` : `Message #${i} — lorem ipsum dolor sit amet.`,
}))

const meta = {
  title: "UI/MessageScroller",
  component: MessageScroller,
  tags: ["autodocs"],
  render: (args) => (
    <MessageScrollerProvider>
      <MessageScroller {...args} className="h-96 w-96 rounded-lg border">
        <MessageScrollerViewport>
          <MessageScrollerContent className="p-4">
            {messages.map((message, index) => (
              <MessageScrollerItem
                key={message.id}
                scrollAnchor={index === messages.length - 1}
              >
                <Bubble
                  align={message.mine ? "end" : "start"}
                  variant={message.mine ? "default" : "muted"}
                >
                  <BubbleContent>{message.text}</BubbleContent>
                </Bubble>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  ),
} satisfies Meta<typeof MessageScroller>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
