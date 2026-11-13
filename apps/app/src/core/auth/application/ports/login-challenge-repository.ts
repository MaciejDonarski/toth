/**
 * The second step of a sign-in. The plain challenge token lives only in the
 * user's cookie; `id` is its SHA-256 hash, so a database leak cannot be
 * replayed as a cookie.
 */
export type LoginChallenge = Readonly<{
  id: string
  userId: string
  codeHash: string | null
  codeExpiresAt: Date
  expiresAt: Date
  attempts: number
  resendCount: number
  lastSentAt: Date
  verifiedAt: Date | null
  consumedAt: Date | null
  viaTrustedDevice: boolean
}>

export type NewLoginChallenge = Readonly<{
  id: string
  userId: string
  codeHash: string | null
  codeExpiresAt: Date
  expiresAt: Date
  now: Date
  ip?: string
  userAgent?: string
  /** Set when a trusted device skips the code: the challenge is born verified. */
  verified?: { grantHash: string }
}>

export type RedeemedGrant = Readonly<{
  challengeId: string
  userId: string
  viaTrustedDevice: boolean
}>

export interface LoginChallengeRepository {
  create(challenge: NewLoginChallenge): Promise<void>

  findById(id: string): Promise<LoginChallenge | null>

  /**
   * Atomically counts one code attempt, but only while the challenge is open
   * (unverified, within its window) and under `maxAttempts`. Returns the
   * updated challenge, or null when no attempt may be made.
   */
  registerAttempt(
    id: string,
    now: Date,
    maxAttempts: number
  ): Promise<LoginChallenge | null>

  /** Atomically marks an open challenge as verified. False if it was not open. */
  markVerified(id: string, grantHash: string, now: Date): Promise<boolean>

  /** Replaces the code (resend). Atomic on `resendCount` to enforce the cap. */
  replaceCode(input: {
    id: string
    codeHash: string
    codeExpiresAt: Date
    now: Date
    expectedResendCount: number
  }): Promise<boolean>

  /**
   * Atomically consumes a grant verified no earlier than `verifiedAfter`.
   * Returns null for unknown, used or stale grants.
   */
  consumeGrant(
    grantHash: string,
    now: Date,
    verifiedAfter: Date
  ): Promise<RedeemedGrant | null>
}
