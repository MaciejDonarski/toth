import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@toth/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@toth/ui/components/tabs"

type DemoProps = {
  variant?: "default" | "line"
  orientation?: "horizontal" | "vertical"
}

function TabsDemo({ variant, orientation }: DemoProps) {
  return (
    <Tabs defaultValue="account" orientation={orientation} className="w-96">
      <TabsList variant={variant}>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="billing" disabled>
          Billing
        </TabsTrigger>
      </TabsList>
      {(["account", "password"] as const).map((tab) => (
        <TabsContent key={tab} value={tab}>
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{tab}</CardTitle>
              <CardDescription>Manage your {tab} settings.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Content for {tab}.
            </CardContent>
            <CardFooter>
              <Button>Save</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  )
}

const meta = {
  title: "UI/Tabs",
  component: TabsDemo,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "line"] },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
  },
  args: { variant: "default", orientation: "horizontal" },
} satisfies Meta<typeof TabsDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Line: Story = { args: { variant: "line" } }
export const Vertical: Story = { args: { orientation: "vertical" } }
