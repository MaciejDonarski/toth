import { AUTH_POLICY } from "../domain/auth-policy"
import { AuthError } from "../domain/errors"
import {
  emailKey,
  enforceRateLimit,
  ipKey,
  withinRateLimit,
} from "./rate-limit"
import type { AuthEventLog } from "./ports/auth-event-log"
import type { AuthNotifier } from "./ports/auth-notifier"
import type { AuthTokenRepository } from "./ports/auth-token-repository"
import type { Clock } from "./ports/clock"
import type { PasswordHasher } from "./ports/password-hasher"
import type { PasswordResetStore } from "./ports/password-reset-store"
import type { RateLimiter } from "./ports/rate-limiter"
import type { TokenService } from "./ports/token-service"
import type { UserAccountRepository } from "./ports/user-account-repository"
import type { RequestMeta } from "./request-meta"
import {
  emailSchema,
  resetPasswordSchema,
  type ResetPasswordInput,
} from "./schemas"

export type RequestPasswordResetDeps = Readonly<{
  users: UserAccountRepository
  authTokens: AuthTokenRepository
  tokenService: TokenService
  rateLimiter: RateLimiter
  notifier: AuthNotifier
  events: AuthEventLog
  clock: Clock
}>

/**
 * Use case: "forgot password". Always completes the same way, whether or not
 * the account exists (no enumeration). For an active account it invalidates
 * older reset links and emails a new single-use link valid for 30 minutes.
 */
export function makeRequestPasswordReset(deps: RequestPasswordResetDeps) {
  const policy = AUTH_POLICY

  return async function requestPasswordReset(
    rawEmail: string,
    meta: RequestMeta
  ): Promise<void> {
    const email = emailSchema.parse(rawEmail)

    await enforceRateLimit(deps.rateLimiter, {
      key: ipKey("reset", meta.ip),
      ...policy.rateLimits.passwordResetPerIp,
    })
    // Per-address cap is silent, so it cannot be used to probe accounts.
    const allowed = await withinRateLimit(deps.rateLimiter, {
      key: emailKey("reset", email),
      ...policy.rateLimits.passwordResetPerEmail,
    })
    if (!allowed) return

    const user = await deps.users.findByEmail(email)
    if (!user || user.status !== "ACTIVE") return

    const now = deps.clock.now()
    const token = deps.tokenService.generateToken()
    await deps.authTokens.issue({
      userId: user.id,
      type: "PASSWORD_RESET",
      tokenHash: deps.tokenService.hashToken(token),
      expiresAt: new Date(now.getTime() + policy.passwordResetTtlMs),
      now,
    })
    await deps.notifier.sendPasswordReset(user.email, {
      token,
      validForMs: policy.passwordResetTtlMs,
    })
    await deps.events.record({
      type: "password_reset_requested",
      userId: user.id,
      companyId: user.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
  }
}

export type RequestPasswordReset = ReturnType<typeof makeRequestPasswordReset>

export type CheckPasswordResetTokenDeps = Readonly<{
  authTokens: AuthTokenRepository
  tokenService: TokenService
  clock: Clock
}>

/** Use case: is this reset link still usable? (Does not consume it.) */
export function makeCheckPasswordResetToken(deps: CheckPasswordResetTokenDeps) {
  return async function checkPasswordResetToken(
    token: string | undefined
  ): Promise<boolean> {
    if (!token) return false
    return deps.authTokens.isActive(
      deps.tokenService.hashToken(token),
      "PASSWORD_RESET",
      deps.clock.now()
    )
  }
}

export type CheckPasswordResetToken = ReturnType<
  typeof makeCheckPasswordResetToken
>

export type ResetPasswordDeps = Readonly<{
  resets: PasswordResetStore
  passwordHasher: PasswordHasher
  tokenService: TokenService
  notifier: AuthNotifier
  events: AuthEventLog
  clock: Clock
}>

/**
 * Use case: set a new password from a reset link. Signs the user out
 * everywhere and forgets every trusted browser; the next sign-in goes
 * through the emailed code again. Throws TOKEN_INVALID.
 */
export function makeResetPassword(deps: ResetPasswordDeps) {
  return async function resetPassword(
    token: string | undefined,
    input: ResetPasswordInput,
    meta: RequestMeta
  ): Promise<void> {
    if (!token) throw new AuthError("TOKEN_INVALID")
    const { password } = resetPasswordSchema.parse(input)

    const passwordHash = await deps.passwordHasher.hash(password)
    const user = await deps.resets.resetWithToken({
      tokenHash: deps.tokenService.hashToken(token),
      passwordHash,
      now: deps.clock.now(),
    })
    if (!user) throw new AuthError("TOKEN_INVALID")

    await deps.events.record({
      type: "password_reset",
      userId: user.userId,
      companyId: user.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    try {
      await deps.notifier.sendPasswordChanged(user.email)
    } catch {
      // The password is already changed; a failed notice must not undo that.
    }
  }
}

export type ResetPassword = ReturnType<typeof makeResetPassword>
