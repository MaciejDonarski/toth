import {
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import type { Permission } from "@/core/auth/domain/permissions"

type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  /**
   * Needed to see the item. Hiding is UX only: the page itself must call
   * `requirePermission` with the same permission.
   */
  permission: Permission
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Przegląd",
    items: [
      {
        title: "Pulpit",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
        permission: "dashboard.view",
      },
    ],
  },
  {
    label: "Zarządzanie",
    items: [
      {
        title: "Użytkownicy",
        href: "/users",
        icon: UsersIcon,
        permission: "users.view",
      },
      {
        title: "Ustawienia",
        href: "/settings",
        icon: SettingsIcon,
        permission: "settings.view",
      },
    ],
  },
]

/** Only the items the user may open; groups left empty are dropped. */
function filterNav(
  groups: readonly NavGroup[],
  permissions: readonly Permission[]
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        permissions.includes(item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0)
}

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function findNavTrail(pathname: string) {
  for (const group of navGroups) {
    const item = group.items.find((i) => isActiveHref(pathname, i.href))
    if (item) {
      return { group, item }
    }
  }
  return null
}

export { filterNav, findNavTrail, isActiveHref, navGroups }
export type { NavGroup, NavItem }
