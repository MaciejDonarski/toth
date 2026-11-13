import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import { Input } from "@toth/ui/components/input"
import { Label } from "@toth/ui/components/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@toth/ui/components/sheet"

type Side = "top" | "right" | "bottom" | "left"

function SheetDemo({ side = "right" }: { side?: Side }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Open {side}
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4">
          <div className="grid gap-2">
            <Label htmlFor={`sheet-name-${side}`}>Name</Label>
            <Input id={`sheet-name-${side}`} defaultValue="Pedro Duarte" />
          </div>
        </div>
        <SheetFooter>
          <Button type="submit">Save changes</Button>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

const meta = {
  title: "UI/Sheet",
  component: SheetDemo,
  tags: ["autodocs"],
  argTypes: {
    side: {
      control: "inline-radio",
      options: ["top", "right", "bottom", "left"],
    },
  },
  args: { side: "right" },
} satisfies Meta<typeof SheetDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Right: Story = {}
export const Left: Story = { args: { side: "left" } }
export const Top: Story = { args: { side: "top" } }
export const Bottom: Story = { args: { side: "bottom" } }
