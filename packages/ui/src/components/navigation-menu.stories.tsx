import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@toth/ui/components/navigation-menu"

const components = [
  {
    title: "Alert Dialog",
    href: "#",
    description: "A modal dialog that interrupts the user.",
  },
  {
    title: "Hover Card",
    href: "#",
    description: "Preview content behind a link.",
  },
  {
    title: "Progress",
    href: "#",
    description: "Displays the completion progress of a task.",
  },
  { title: "Tabs", href: "#", description: "Layered sections of content." },
]

const meta = {
  title: "UI/NavigationMenu",
  component: NavigationMenu,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: (args) => (
    <NavigationMenu {...args}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-96 gap-2 p-2">
              <li>
                <NavigationMenuLink href="#">
                  <div className="font-medium">Introduction</div>
                  <div className="text-muted-foreground">
                    Re-usable components built with Base UI.
                  </div>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#">
                  <div className="font-medium">Installation</div>
                  <div className="text-muted-foreground">
                    How to install dependencies.
                  </div>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[32rem] grid-cols-2 gap-2 p-2">
              {components.map((component) => (
                <li key={component.title}>
                  <NavigationMenuLink href={component.href}>
                    <div className="font-medium">{component.title}</div>
                    <div className="line-clamp-2 text-muted-foreground">
                      {component.description}
                    </div>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
            Docs
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
} satisfies Meta<typeof NavigationMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
