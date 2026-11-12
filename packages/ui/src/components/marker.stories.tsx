import type { Meta, StoryObj } from "@storybook/react-vite"
import { SparklesIcon } from "lucide-react"

import { Marker, MarkerContent, MarkerIcon } from "@toth/ui/components/marker"

const meta = {
  title: "UI/Marker",
  component: Marker,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["default", "separator", "border"],
    },
  },
  args: { variant: "default" },
  render: (args) => (
    <div className="w-96">
      <Marker {...args}>
        <MarkerIcon>
          <SparklesIcon />
        </MarkerIcon>
        <MarkerContent>Today</MarkerContent>
      </Marker>
    </div>
  ),
} satisfies Meta<typeof Marker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Separator: Story = { args: { variant: "separator" } }
export const Border: Story = { args: { variant: "border" } }
