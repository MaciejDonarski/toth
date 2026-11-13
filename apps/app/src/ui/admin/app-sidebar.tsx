"use client"

import { Fragment, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@toth/ui/components/sidebar"

import type { Permission } from "@/core/auth/domain/permissions"
import { LogoMark } from "@/ui/brand/logo"

import { filterNav, isActiveHref, navGroups } from "./nav-config"

function AppSidebar({
  permissions,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  /** The signed-in user's permissions; only matching items are shown. */
  permissions: readonly Permission[]
}) {
  const pathname = usePathname()
  const groups = useMemo(() => filterNav(navGroups, permissions), [permissions])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <LogoMark />
              <span className="font-heading text-base font-medium">Toth</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group, index) => (
          <Fragment key={group.label}>
            {index > 0 && <SidebarSeparator className="mx-0" />}
            <SidebarGroup>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActiveHref(pathname, item.href)}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </Fragment>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

export { AppSidebar }
