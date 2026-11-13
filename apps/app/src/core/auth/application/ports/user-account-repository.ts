import type { Role } from "../../domain/role"

/**
 * A user's own account, as seen by authentication flows. These run before a
 * tenant context exists (sign-in, verification, reset), so lookups are by
 * email or id — never used to read other tenants' business data.
 */
export type UserAccount = Readonly<{
  id: string
  companyId: string
  email: string
  name: string | null
  role: Role
  status: "ACTIVE" | "DISABLED"
  passwordHash: string
  emailVerifiedAt: Date | null
  passwordChangedAt: Date
  failedLoginCount: number
  lockedUntil: Date | null
}>

export interface UserAccountRepository {
  findByEmail(email: string): Promise<UserAccount | null>
  findById(id: string): Promise<UserAccount | null>
  /** Sets `emailVerifiedAt` unless it is already set. */
  markEmailVerified(userId: string, at: Date): Promise<void>

  /**
   * Atomically counts a failed password and locks the account once the count
   * reaches `maxAttempts` (resetting the counter). Reports a fresh lock.
   */
  recordFailedLogin(input: {
    userId: string
    now: Date
    maxAttempts: number
    lockoutMs: number
  }): Promise<{ lockedUntil: Date | null }>

  /** Clears the failed-login counter after a correct password. */
  resetFailedLogins(userId: string): Promise<void>

  recordLogin(userId: string, at: Date): Promise<void>
}
