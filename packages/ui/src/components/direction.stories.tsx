import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import { DirectionProvider } from "@toth/ui/components/direction"
import { Slider } from "@toth/ui/components/slider"

const meta = {
  title: "UI/Direction",
  component: DirectionProvider,
  tags: ["autodocs"],
  argTypes: { direction: { control: "inline-radio", options: ["ltr", "rtl"] } },
  args: { direction: "rtl" },
  render: (args) => (
    <DirectionProvider {...args}>
      <div dir={args.direction} className="flex w-72 flex-col gap-4">
        <Slider defaultValue={[30]} />
        <div className="flex gap-2">
          <Button>أول</Button>
          <Button variant="outline">ثاني</Button>
        </div>
      </div>
    </DirectionProvider>
  ),
} satisfies Meta<typeof DirectionProvider>

export default meta
type Story = StoryObj<typeof meta>

export const RightToLeft: Story = {}
export const LeftToRight: Story = { args: { direction: "ltr" } }
