import { Separator } from "@toth/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@toth/ui/components/sidebar"

import { AdminBreadcrumbs } from "./admin-breadcrumbs"
import { AppSidebar } from "./app-sidebar"
import { UserMenu, type User } from "./user-menu"

function AdminShell({
  children,
  defaultOpen = true,
  user,
  onLogout,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
  user: User
  onLogout: () => Promise<void>
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-center"
          />
          <AdminBreadcrumbs />
          <div className="ml-auto">
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export { AdminShell }
