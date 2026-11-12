import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  CalendarIcon,
  HomeIcon,
  InboxIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@toth/ui/components/sidebar"
import { TooltipProvider } from "@toth/ui/components/tooltip"

const items = [
  { title: "Home", icon: HomeIcon, badge: undefined },
  { title: "Inbox", icon: InboxIcon, badge: "24" },
  { title: "Calendar", icon: CalendarIcon, badge: undefined },
  { title: "Search", icon: SearchIcon, badge: undefined },
  { title: "Settings", icon: SettingsIcon, badge: undefined },
]

type DemoProps = {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
  loading?: boolean
}

function SidebarDemo({ side, variant, collapsible, loading }: DemoProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar side={side} variant={variant} collapsible={collapsible}>
          <SidebarHeader>
            <SidebarInput placeholder="Search..." />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Application</SidebarGroupLabel>
              <SidebarGroupAction title="Add project">
                <PlusIcon />
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  {loading
                    ? Array.from({ length: 5 }, (_, i) => (
                        <SidebarMenuItem key={i}>
                          <SidebarMenuSkeleton showIcon />
                        </SidebarMenuItem>
                      ))
                    : items.map((item, index) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            isActive={index === 0}
                            tooltip={item.title}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                          {item.badge && (
                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                          )}
                        </SidebarMenuItem>
                      ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Design system</SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#" isActive>
                        Components
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#">
                        Tokens
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Jane Doe</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <span className="text-sm font-medium">Dashboard</span>
          </header>
          <div className="p-4 text-sm text-muted-foreground">
            Press Ctrl/⌘ + B to toggle the sidebar.
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

const meta = {
  title: "UI/Sidebar",
  component: SidebarDemo,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    side: { control: "inline-radio", options: ["left", "right"] },
    variant: {
      control: "inline-radio",
      options: ["sidebar", "floating", "inset"],
    },
    collapsible: {
      control: "inline-radio",
      options: ["offcanvas", "icon", "none"],
    },
  },
  args: {
    side: "left",
    variant: "sidebar",
    collapsible: "icon",
    loading: false,
  },
} satisfies Meta<typeof SidebarDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Floating: Story = { args: { variant: "floating" } }
export const Inset: Story = { args: { variant: "inset" } }
export const Loading: Story = { args: { loading: true } }
