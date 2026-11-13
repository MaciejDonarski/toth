/**
 * Domain: tunable security policy for authentication. Change values here only.
 */
const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const AUTH_POLICY = Object.freeze({
  /** Session ends after this long without activity. */
  sessionIdleTimeoutMs: 1 * HOUR,
  /** Session ends this long after sign-in, regardless of activity (= JWT maxAge). */
  sessionAbsoluteTtlMs: 7 * DAY,
  /** `Session.lastSeenAt` is written at most this often. */
  sessionTouchThrottleMs: 1 * MINUTE,

  /** Validity of an emailed login code. */
  loginCodeTtlMs: 3 * MINUTE,
  loginCodeLength: 6,
  loginCodeMaxAttempts: 5,
  loginCodeResendCooldownMs: 60 * SECOND,
  loginCodeMaxResends: 5,
  /** Whole window for completing the second step. */
  loginChallengeTtlMs: 15 * MINUTE,
  /** A verified challenge must be redeemed for a session within this time. */
  loginGrantTtlMs: 60 * SECOND,

  /** "Remember this browser": hard expiry from the moment of trust. */
  trustedDeviceTtlMs: 30 * DAY,

  passwordResetTtlMs: 30 * MINUTE,
  emailVerificationTtlMs: 24 * HOUR,
  emailVerificationResendCooldownMs: 60 * SECOND,
  invitationTtlMs: 72 * HOUR,

  loginMaxFailedAttempts: 5,
  loginLockoutMs: 15 * MINUTE,

  defaultCompanyUserLimit: 5,
  termsVersion: "2026-11-01",

  /** Fixed-window limits per bucket (see RateLimiter port). */
  rateLimits: Object.freeze({
    registerPerIp: { limit: 5, windowMs: 1 * HOUR },
    /** "Someone tried to register with your email" mails per address. */
    registrationAttemptMailPerEmail: { limit: 3, windowMs: 1 * HOUR },
    verificationResendPerIp: { limit: 10, windowMs: 1 * HOUR },
    verificationResendPerEmail: { limit: 5, windowMs: 1 * HOUR },
    loginPerIp: { limit: 20, windowMs: 15 * MINUTE },
    loginPerEmail: { limit: 10, windowMs: 15 * MINUTE },
    passwordResetPerIp: { limit: 5, windowMs: 1 * HOUR },
    passwordResetPerEmail: { limit: 3, windowMs: 1 * HOUR },
  }),
})

export type AuthPolicy = typeof AUTH_POLICY
