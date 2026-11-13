import type { Meta, StoryObj } from "@storybook/react-vite"

import { Skeleton } from "@toth/ui/components/skeleton"

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-60" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  ),
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Card: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
}
