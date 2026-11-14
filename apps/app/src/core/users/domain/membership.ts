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
  /** The company must keep at least one active admin. */
  | "LAST_ADMIN"
  | "NOT_FOUND"
  | "USER_LIMIT_REACHED"
