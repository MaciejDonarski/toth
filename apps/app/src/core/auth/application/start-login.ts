import { AUTH_POLICY } from "../domain/auth-policy"
import { maskEmail } from "../domain/email"
import { AuthError } from "../domain/errors"
import { emailKey, enforceRateLimit, ipKey } from "./rate-limit"
import type { AuthEventLog } from "./ports/auth-event-log"
import type { AuthNotifier } from "./ports/auth-notifier"
import type { Clock } from "./ports/clock"
import type { LoginChallengeRepository } from "./ports/login-challenge-repository"
import type { PasswordHasher } from "./ports/password-hasher"
import type { RateLimiter } from "./ports/rate-limiter"
import type { TokenService } from "./ports/token-service"
import type { TrustedDeviceRepository } from "./ports/trusted-device-repository"
import type {
  UserAccount,
  UserAccountRepository,
} from "./ports/user-account-repository"
import type { RequestMeta } from "./request-meta"
import { loginSchema, type LoginInput } from "./schemas"

export type StartLoginDeps = Readonly<{
  users: UserAccountRepository
  challenges: LoginChallengeRepository
  trustedDevices: TrustedDeviceRepository
  passwordHasher: PasswordHasher
  tokenService: TokenService
  rateLimiter: RateLimiter
  notifier: AuthNotifier
  events: AuthEventLog
  clock: Clock
}>

export type ChallengeView = Readonly<{
  maskedEmail: string
  codeExpiresAt: Date
  nextResendAt: Date
  resendsLeft: number
}>

export type StartLoginResult =
  /** A code was emailed. Keep `challengeToken` in an httpOnly cookie. */
  | ({ kind: "code-sent"; challengeToken: string } & ChallengeView)
  /** A trusted device skipped the code. Redeem `grant` for a session. */
  | { kind: "granted"; grant: string }

/**
 * Use case: first sign-in step (email + password).
 *
 * Every failure that could reveal whether an account exists is reported as
 * INVALID_CREDENTIALS. Lockout and "email not verified" are only revealed
 * after the correct password was given.
 */
export function makeStartLogin(deps: StartLoginDeps) {
  const policy = AUTH_POLICY

  async function failPassword(
    user: UserAccount,
    meta: RequestMeta,
    now: Date
  ): Promise<never> {
    const { lockedUntil } = await deps.users.recordFailedLogin({
      userId: user.id,
      now,
      maxAttempts: policy.loginMaxFailedAttempts,
      lockoutMs: policy.loginLockoutMs,
    })
    await deps.events.record({
      type: lockedUntil ? "login_locked" : "login_failed",
      userId: user.id,
      companyId: user.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    if (lockedUntil) {
      await deps.notifier.sendAccountLocked(user.email, {
        lockedForMs: policy.loginLockoutMs,
      })
    }
    throw new AuthError("INVALID_CREDENTIALS")
  }

  return async function startLogin(
    input: LoginInput,
    meta: RequestMeta,
    trustedDeviceToken?: string
  ): Promise<StartLoginResult> {
    const { email, password } = loginSchema.parse(input)

    await enforceRateLimit(deps.rateLimiter, {
      key: ipKey("login", meta.ip),
      ...policy.rateLimits.loginPerIp,
    })
    await enforceRateLimit(deps.rateLimiter, {
      key: emailKey("login", email),
      ...policy.rateLimits.loginPerEmail,
    })

    const now = deps.clock.now()
    const user = await deps.users.findByEmail(email)
    if (!user) {
      await deps.passwordHasher.verifyDummy(password)
      throw new AuthError("INVALID_CREDENTIALS")
    }

    const passwordOk = await deps.passwordHasher.verify(
      user.passwordHash,
      password
    )
    const locked = !!user.lockedUntil && user.lockedUntil > now

    if (!passwordOk) {
      // While locked, wrong passwords neither count nor reveal the lock.
      if (locked) throw new AuthError("INVALID_CREDENTIALS")
      return failPassword(user, meta, now)
    }
    if (locked) {
      throw new AuthError("ACCOUNT_LOCKED", { retryAt: user.lockedUntil })
    }
    if (user.status !== "ACTIVE") throw new AuthError("INVALID_CREDENTIALS")
    if (!user.emailVerifiedAt) {
      throw new AuthError("EMAIL_NOT_VERIFIED", { email: user.email })
    }

    if (user.failedLoginCount > 0) await deps.users.resetFailedLogins(user.id)

    const challengeToken = deps.tokenService.generateToken()
    const challengeId = deps.tokenService.hashToken(challengeToken)
    const expiresAt = new Date(now.getTime() + policy.loginChallengeTtlMs)

    // Trusted browser: skip the emailed code.
    if (trustedDeviceToken) {
      const device = await deps.trustedDevices.findValid({
        tokenHash: deps.tokenService.hashToken(trustedDeviceToken),
        userId: user.id,
        now,
        trustedSince: user.passwordChangedAt,
      })
      if (device) {
        const grant = deps.tokenService.generateToken()
        await deps.challenges.create({
          id: challengeId,
          userId: user.id,
          codeHash: null,
          codeExpiresAt: now,
          expiresAt,
          now,
          ip: meta.ip,
          userAgent: meta.userAgent,
          verified: { grantHash: deps.tokenService.hashToken(grant) },
        })
        await deps.trustedDevices.touch(device.id, now)
        return { kind: "granted", grant }
      }
    }

    const code = deps.tokenService.generateCode(policy.loginCodeLength)
    const codeExpiresAt = new Date(now.getTime() + policy.loginCodeTtlMs)
    await deps.challenges.create({
      id: challengeId,
      userId: user.id,
      codeHash: deps.tokenService.hashCode(code),
      codeExpiresAt,
      expiresAt,
      now,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    await deps.notifier.sendLoginCode(user.email, {
      code,
      validForMs: policy.loginCodeTtlMs,
    })
    await deps.events.record({
      type: "login_code_sent",
      userId: user.id,
      companyId: user.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })

    return {
      kind: "code-sent",
      challengeToken,
      maskedEmail: maskEmail(user.email),
      codeExpiresAt,
      nextResendAt: new Date(now.getTime() + policy.loginCodeResendCooldownMs),
      resendsLeft: policy.loginCodeMaxResends,
    }
  }
}

export type StartLogin = ReturnType<typeof makeStartLogin>
