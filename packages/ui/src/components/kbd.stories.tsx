import type { Meta, StoryObj } from "@storybook/react-vite"

import { Kbd, KbdGroup } from "@toth/ui/components/kbd"

const meta = {
  title: "UI/Kbd",
  component: Kbd,
  tags: ["autodocs"],
  args: { children: "⌘" },
} satisfies Meta<typeof Kbd>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Group: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>Ctrl</Kbd>
      <span>+</span>
      <Kbd>B</Kbd>
    </KbdGroup>
  ),
}
