import { cookies } from "next/headers"

import { AdminShell } from "@/ui/admin/admin-shell"

import { logout } from "./actions"

// TODO: replace with the signed-in user once authentication exists.
const user = { name: "Jane Doe", email: "jane@example.com" }

export default async function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <AdminShell defaultOpen={defaultOpen} user={user} onLogout={logout}>
      {children}
    </AdminShell>
  )
}
