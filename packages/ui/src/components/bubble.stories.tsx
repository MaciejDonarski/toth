import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@toth/ui/components/bubble"

const meta = {
  title: "UI/Bubble",
  component: Bubble,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "muted",
        "tinted",
        "outline",
        "ghost",
        "destructive",
      ],
    },
    align: { control: "inline-radio", options: ["start", "end"] },
  },
  args: { variant: "default", align: "start" },
  render: (args) => (
    <Bubble {...args}>
      <BubbleContent>Hey! Did you get a chance to review the PR?</BubbleContent>
    </Bubble>
  ),
} satisfies Meta<typeof Bubble>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { variant: "secondary" } }
export const Muted: Story = { args: { variant: "muted" } }
export const Outline: Story = { args: { variant: "outline" } }
export const Destructive: Story = { args: { variant: "destructive" } }
export const Conversation: Story = {
  render: () => (
    <BubbleGroup className="w-80">
      <Bubble variant="muted">
        <BubbleContent>Is the build green?</BubbleContent>
      </Bubble>
      <Bubble align="end">
        <BubbleContent>Yes, all checks passed.</BubbleContent>
        <BubbleReactions>🎉</BubbleReactions>
      </Bubble>
    </BubbleGroup>
  ),
}
