import { cookies } from "next/headers"

import { requireUser } from "@/auth/dal"
import { AdminShell } from "@/ui/admin/admin-shell"

import { logout } from "./actions"

// Layouts do not re-run on client navigation, so every page also calls
// requirePermission() itself. This check only provides the user (and the
// permissions that filter the navigation) for the shell.
export default async function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, cookieStore] = await Promise.all([requireUser(), cookies()])
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <AdminShell
      defaultOpen={defaultOpen}
      user={{ name: user.name ?? user.email, email: user.email }}
      permissions={user.permissions}
      onLogout={logout}
    >
      {children}
    </AdminShell>
  )
}
