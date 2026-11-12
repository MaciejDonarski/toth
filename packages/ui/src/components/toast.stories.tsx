import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import { Toaster, toast } from "@toth/ui/components/toast"

const types = ["success", "info", "warning", "error", "loading"] as const

function ToastDemo() {
  return (
    <Toaster>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() =>
            toast.add({
              title: "Event created",
              description: "Sunday, December 03 at 9:00 AM",
            })
          }
        >
          Default
        </Button>
        {types.map((type) => (
          <Button
            key={type}
            variant="outline"
            className="capitalize"
            onClick={() =>
              toast.add({
                title: `${type} toast`,
                description: "Something happened.",
                type,
              })
            }
          >
            {type}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
              loading: "Saving...",
              success: "Saved!",
              error: "Could not save.",
            })
          }
        >
          Promise
        </Button>
      </div>
    </Toaster>
  )
}

const meta = {
  title: "UI/Toast",
  component: ToastDemo,
  tags: ["autodocs"],
} satisfies Meta<typeof ToastDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
