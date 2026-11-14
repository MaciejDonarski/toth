import type { Role } from "@/core/auth/domain/role"
import type { UserStatus } from "@/core/auth/domain/user-status"

/** A row of the users table, as `/api/tables/users` sends it. */
export type MemberRow = {
  id: string
  name: string | null
  email: string
  /** Formatted for display, or null. */
  phone: string | null
  color: string
  role: Role
  status: UserStatus
  /** The signed-in user's own row. */
  isSelf: boolean
  /** Role/status may be changed and the member deleted (not self, not an admin). */
  manageable: boolean
}

/** A row of the invitations table, as `/api/tables/invitations` sends it. */
export type InvitationRow = {
  id: string
  email: string
  role: Role
  /** Epoch ms. */
  expiresAt: number
}
