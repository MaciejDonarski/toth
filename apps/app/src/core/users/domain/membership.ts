/**
 * Domain: company membership rules. Role names are shown via the message
 * key `roles.<ROLE>`.
 */

/** Seats taken = active users + pending (unexpired, unrevoked) invitations. */
export type SeatUsage = Readonly<{ used: number; limit: number }>

export function hasFreeSeat(usage: SeatUsage): boolean {
  return usage.used < usage.limit
}

export type MemberChangeError =
  /** Admins cannot change their own role or disable themselves. */
  | "SELF_CHANGE"
  /** Members with the ADMIN role cannot be changed, disabled or deleted. */
  | "ADMIN_PROTECTED"
  /** The company must keep at least one active admin. */
  | "LAST_ADMIN"
  | "NOT_FOUND"
  | "USER_LIMIT_REACHED"

/**
 * Whether `actorId` may change role/status of, or delete, this member at all.
 * Nobody touches their own account here, and admins are untouchable. The UI
 * hides the row menu on the same rule; repositories re-check it under a lock.
 */
export function isManageableMember(
  member: Readonly<{ id: string; role: string }>,
  actorId: string
): boolean {
  return member.id !== actorId && member.role !== "ADMIN"
}
