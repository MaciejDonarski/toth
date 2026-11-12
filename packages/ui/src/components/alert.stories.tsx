import type { Meta, StoryObj } from "@storybook/react-vite"
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@toth/ui/components/alert"
import { Button } from "@toth/ui/components/button"

const meta = {
  title: "UI/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "destructive"] },
  },
  args: { variant: "default" },
  render: (args) => (
    <Alert {...args} className="w-96">
      {args.variant === "destructive" ? (
        <AlertCircleIcon />
      ) : (
        <CheckCircle2Icon />
      )}
      <AlertTitle>
        {args.variant === "destructive"
          ? "Payment failed"
          : "Success! Changes saved"}
      </AlertTitle>
      <AlertDescription>
        {args.variant === "destructive"
          ? "Please verify your billing information and try again."
          : "This is an alert with icon, title and description."}
      </AlertDescription>
    </Alert>
  ),
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Destructive: Story = { args: { variant: "destructive" } }
export const WithAction: Story = {
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>New version available</AlertTitle>
      <AlertDescription>Reload to get the latest features.</AlertDescription>
      <AlertAction>
        <Button size="xs">Reload</Button>
      </AlertAction>
    </Alert>
  ),
}
