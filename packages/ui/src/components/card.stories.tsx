import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"
import { Input } from "@toth/ui/components/input"
import { Label } from "@toth/ui/components/label"

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: { size: { control: "inline-radio", options: ["default", "sm"] } },
  args: { size: "default" },
  render: (args) => (
    <Card {...args} className="w-96">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>Enter your email below to login.</CardDescription>
        <CardAction>
          <Button variant="link">Sign up</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <Label htmlFor="card-email">Email</Label>
          <Input id="card-email" type="email" placeholder="m@example.com" />
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">Login</Button>
        <Button variant="outline" className="w-full">
          Login with Google
        </Button>
      </CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Small: Story = { args: { size: "sm" } }
