import type { Role } from "@/core/auth/domain/role"

/**
 * Domain: company membership rules.
 */

export const ROLE_LABELS: Readonly<Record<Role, string>> = Object.freeze({
  ADMIN: "Administrator",
  MANAGER: "Kierownik",
  WORKER: "Pracownik",
})

/** Seats taken = active users + pending (unexpired, unrevoked) invitations. */
export type SeatUsage = Readonly<{ used: number; limit: number }>

export function hasFreeSeat(usage: SeatUsage): boolean {
  return usage.used < usage.limit
}

export type MemberChangeError =
  /** Admins cannot change their own role or disable themselves. */
  | "SELF_CHANGE"
  /** The company must keep at least one active admin. */
  | "LAST_ADMIN"
  | "NOT_FOUND"
  | "USER_LIMIT_REACHED"
