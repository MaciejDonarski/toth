import { Avatar, AvatarFallback, AvatarImage } from "@toth/ui/components/avatar"

import { userColorStyle } from "@/core/users/domain/user-color"

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export type UserAvatarProps = {
  /** Shown as initials; fall back to the email when the user has no name. */
  name: string
  /** A key of `USER_COLORS`. */
  color?: string
  src?: string
  size?: "default" | "sm" | "lg"
  className?: string
}

/** The user's initials on their own colour (see `user-color.ts`). Decorative. */
export function UserAvatar({
  name,
  color,
  src,
  size,
  className,
}: UserAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback style={color ? userColorStyle(color) : undefined}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
