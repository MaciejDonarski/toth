import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import { Spinner } from "@toth/ui/components/spinner"

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Large: Story = { args: { className: "size-8" } }
export const InButton: Story = {
  render: () => (
    <Button disabled>
      <Spinner data-icon="inline-start" /> Processing
    </Button>
  ),
}
