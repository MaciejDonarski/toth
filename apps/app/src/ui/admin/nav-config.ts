import {
  LayoutDashboardIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import type { Permission } from "@/core/auth/domain/permissions"

type NavItem = {
  /** Message key: `nav.items.<key>`. */
  key: "dashboard" | "users" | "settings" | "profile"
  href: string
  icon: LucideIcon
  /**
   * Needed to see the item. Hiding is UX only: the page itself must call
   * `requirePermission` with the same permission.
   */
  permission: Permission
}

type NavGroup = {
  /** Message key: `nav.groups.<key>`. */
  key: "overview" | "management" | "account"
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    key: "overview",
    items: [
      {
        key: "dashboard",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
        permission: "dashboard.view",
      },
    ],
  },
  {
    key: "management",
    items: [
      {
        key: "users",
        href: "/users",
        icon: UsersIcon,
        permission: "users.view",
      },
      {
        key: "settings",
        href: "/settings",
        icon: SettingsIcon,
        permission: "settings.view",
      },
    ],
  },
  {
    key: "account",
    items: [
      {
        key: "profile",
        href: "/profile",
        icon: UserIcon,
        permission: "profile.edit-own",
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
