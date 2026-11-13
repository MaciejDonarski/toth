import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronsUpDownIcon } from "lucide-react"

import { Button } from "@toth/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@toth/ui/components/collapsible"

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
  render: (args) => (
    <Collapsible {...args} className="flex w-80 flex-col gap-2">
      <div className="flex items-center justify-between gap-4 px-4">
        <h4 className="text-sm font-semibold">
          @peduarte starred 3 repositories
        </h4>
        <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <ChevronsUpDownIcon />
          <span className="sr-only">Toggle</span>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-2 font-mono text-sm">
        @radix-ui/primitives
      </div>
      <CollapsibleContent className="flex flex-col gap-2">
        <div className="rounded-md border px-4 py-2 font-mono text-sm">
          @radix-ui/colors
        </div>
        <div className="rounded-md border px-4 py-2 font-mono text-sm">
          @stitches/react
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Open: Story = { args: { defaultOpen: true } }
