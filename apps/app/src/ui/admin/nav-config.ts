import {
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Users", href: "/users", icon: UsersIcon },
      { title: "Settings", href: "/settings", icon: SettingsIcon },
    ],
  },
]

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

export { findNavTrail, isActiveHref, navGroups }
export type { NavGroup, NavItem }
