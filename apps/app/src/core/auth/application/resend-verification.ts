import { AUTH_POLICY } from "../domain/auth-policy"
import {
  emailKey,
  enforceRateLimit,
  ipKey,
  withinRateLimit,
} from "./rate-limit"
import type { AuthTokenRepository } from "./ports/auth-token-repository"
import type { AuthNotifier } from "./ports/auth-notifier"
import type { Clock } from "./ports/clock"
import type { RateLimiter } from "./ports/rate-limiter"
import type { TokenService } from "./ports/token-service"
import type { UserAccountRepository } from "./ports/user-account-repository"
import type { RequestMeta } from "./request-meta"
import { emailSchema } from "./schemas"

export type ResendVerificationDeps = Readonly<{
  users: UserAccountRepository
  authTokens: AuthTokenRepository
  tokenService: TokenService
  rateLimiter: RateLimiter
  notifier: AuthNotifier
  clock: Clock
}>

/**
 * Use case: send a fresh email verification link. Silent no-op when the
 * account does not exist, is already verified, is disabled, or a link was
 * sent less than the cooldown ago — the caller cannot tell these apart.
 */
export function makeResendVerification(deps: ResendVerificationDeps) {
  const { rateLimits } = AUTH_POLICY

  return async function resendVerification(
    rawEmail: string,
    meta: RequestMeta
  ): Promise<void> {
    const email = emailSchema.parse(rawEmail)

    await enforceRateLimit(deps.rateLimiter, {
      key: ipKey("verify-resend", meta.ip),
      ...rateLimits.verificationResendPerIp,
    })
    const allowedForEmail = await withinRateLimit(deps.rateLimiter, {
      key: emailKey("verify-resend", email),
      ...rateLimits.verificationResendPerEmail,
    })
    if (!allowedForEmail) return

    const user = await deps.users.findByEmail(email)
    if (!user || user.emailVerifiedAt || user.status !== "ACTIVE") return

    const now = deps.clock.now()
    const lastSent = await deps.authTokens.latestIssuedAt(
      user.id,
      "EMAIL_VERIFICATION"
    )
    if (
      lastSent &&
      now.getTime() - lastSent.getTime() <
        AUTH_POLICY.emailVerificationResendCooldownMs
    ) {
      return
    }

    const token = deps.tokenService.generateToken()
    await deps.authTokens.issue({
      userId: user.id,
      type: "EMAIL_VERIFICATION",
      tokenHash: deps.tokenService.hashToken(token),
      expiresAt: new Date(now.getTime() + AUTH_POLICY.emailVerificationTtlMs),
      now,
    })
    await deps.notifier.sendEmailVerification(user.email, {
      token,
      validForMs: AUTH_POLICY.emailVerificationTtlMs,
    })
  }
}

export type ResendVerification = ReturnType<typeof makeResendVerification>
