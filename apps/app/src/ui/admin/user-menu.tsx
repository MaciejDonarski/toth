"use client"

import { useTransition } from "react"
import { LogOutIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@toth/ui/components/avatar"
import { Button } from "@toth/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@toth/ui/components/dropdown-menu"
import { cn } from "@toth/ui/lib/utils"

type User = {
  name: string
  email: string
  avatar?: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function UserIdentity({
  user,
  textClassName,
}: {
  user: User
  textClassName?: string
}) {
  return (
    <>
      <Avatar>
        {user.avatar && <AvatarImage src={user.avatar} alt="" />}
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "grid min-w-0 flex-1 text-left text-sm leading-tight",
          textClassName
        )}
      >
        <span className="truncate font-medium text-foreground">
          {user.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      </span>
    </>
  )
}

function UserMenu({
  user,
  onLogout,
}: {
  user: User
  onLogout: () => Promise<void>
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const [isLoggingOut, startLogout] = useTransition()
  const isDark = resolvedTheme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto gap-2 px-2 py-1.5"
            aria-label={`Account menu for ${user.name}`}
          />
        }
      >
        <UserIdentity user={user} textClassName="hidden max-w-48 sm:grid" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 px-1 py-1.5 font-normal">
            <UserIdentity user={user} />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <SunIcon /> : <MoonIcon />}
            {isDark ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isLoggingOut}
          onClick={() => startLogout(onLogout)}
        >
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { UserMenu }
export type { User }
