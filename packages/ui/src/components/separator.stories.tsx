import type { Meta, StoryObj } from "@storybook/react-vite"

import { Separator } from "@toth/ui/components/separator"

const meta = {
  title: "UI/Separator",
  component: Separator,
  tags: ["autodocs"],
  render: () => (
    <div className="w-72">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm leading-none font-medium">Base UI Primitives</h4>
        <p className="text-sm text-muted-foreground">
          An open-source UI component library.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  ),
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
