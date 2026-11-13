import type { Meta, StoryObj } from "@storybook/react-vite"

import { ScrollArea, ScrollBar } from "@toth/ui/components/scroll-area"
import { Separator } from "@toth/ui/components/separator"

const tags = Array.from({ length: 50 }, (_, i) => `v1.2.0-beta.${50 - i}`)

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

export const Vertical: Story = {
  render: (args) => (
    <ScrollArea {...args} className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm leading-none font-medium">Tags</h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const Horizontal: Story = {
  render: (args) => (
    <ScrollArea {...args} className="w-96 rounded-md border whitespace-nowrap">
      <div className="flex w-max gap-4 p-4">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="flex size-32 items-center justify-center rounded-md bg-muted"
          >
            {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
}
