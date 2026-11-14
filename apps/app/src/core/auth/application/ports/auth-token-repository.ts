export type AuthTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET"

export interface AuthTokenRepository {
  /**
   * Stores a new single-use token and invalidates every still-active token of
   * the same type for that user, so only the latest link works.
   */
  issue(input: {
    userId: string
    type: AuthTokenType
    tokenHash: string
    expiresAt: Date
    now: Date
  }): Promise<void>

  /**
   * Atomically marks an active (unconsumed, unexpired) token as used.
   * Returns its owner, or null when the token is unknown, used or expired.
   */
  consume(
    tokenHash: string,
    type: AuthTokenType,
    now: Date
  ): Promise<{ userId: string } | null>

  /** Whether an active token exists, without consuming it (to render a form). */
  isActive(tokenHash: string, type: AuthTokenType, now: Date): Promise<boolean>

  /** When the latest token of this type was issued, for resend cooldowns. */
  latestIssuedAt(userId: string, type: AuthTokenType): Promise<Date | null>
}
