import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import { Kbd } from "@toth/ui/components/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@toth/ui/components/tooltip"

type DemoProps = {
  side?: "top" | "right" | "bottom" | "left"
  defaultOpen?: boolean
}

function TooltipDemo({ side, defaultOpen }: DemoProps) {
  return (
    <TooltipProvider>
      <Tooltip defaultOpen={defaultOpen}>
        <TooltipTrigger render={<Button variant="outline" />}>
          Hover
        </TooltipTrigger>
        <TooltipContent side={side}>
          Add to library <Kbd>⌘L</Kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const meta = {
  title: "UI/Tooltip",
  component: TooltipDemo,
  tags: ["autodocs"],
  argTypes: {
    side: {
      control: "inline-radio",
      options: ["top", "right", "bottom", "left"],
    },
  },
  args: { side: "top" },
} satisfies Meta<typeof TooltipDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Open: Story = { args: { defaultOpen: true } }
export const Bottom: Story = { args: { side: "bottom", defaultOpen: true } }
