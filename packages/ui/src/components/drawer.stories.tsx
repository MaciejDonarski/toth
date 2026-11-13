import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@toth/ui/components/drawer"

const meta = {
  title: "UI/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  argTypes: {
    swipeDirection: {
      control: "inline-radio",
      options: ["down", "up", "left", "right"],
    },
  },
  args: { swipeDirection: "down", showSwipeHandle: true },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger render={<Button variant="outline" />}>
        Open drawer
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Move goal</DrawerTitle>
            <DrawerDescription>Set your daily activity goal.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 text-center text-5xl font-bold tracking-tighter">
            350
          </div>
          <DrawerFooter>
            <Button>Submit</Button>
            <DrawerClose render={<Button variant="outline" />}>
              Cancel
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  ),
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

export const Bottom: Story = {}
export const Right: Story = {
  args: { swipeDirection: "right", showSwipeHandle: false },
}
