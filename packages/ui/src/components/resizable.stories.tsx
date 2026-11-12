import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@toth/ui/components/resizable"

const meta = {
  title: "UI/Resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
  args: { orientation: "horizontal" },
} satisfies Meta<typeof ResizablePanelGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <ResizablePanelGroup
      {...args}
      className="min-h-52 max-w-md rounded-lg border"
    >
      <ResizablePanel defaultSize="50%">
        <div className="flex h-full items-center justify-center p-6 font-semibold">
          One
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="50%">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel defaultSize="25%">
            <div className="flex h-full items-center justify-center p-6 font-semibold">
              Two
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="75%">
            <div className="flex h-full items-center justify-center p-6 font-semibold">
              Three
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}
