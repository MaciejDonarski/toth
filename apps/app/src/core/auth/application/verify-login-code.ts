import { AUTH_POLICY } from "../domain/auth-policy"
import { AuthError } from "../domain/errors"
import { isChallengeOpen } from "./login-challenge-view"
import type { AuthEventLog } from "./ports/auth-event-log"
import type { Clock } from "./ports/clock"
import type { LoginChallengeRepository } from "./ports/login-challenge-repository"
import type { TokenService } from "./ports/token-service"
import type { TrustedDeviceRepository } from "./ports/trusted-device-repository"
import type { RequestMeta } from "./request-meta"
import { loginCodeSchema, type LoginCodeInput } from "./schemas"

export type VerifyLoginCodeDeps = Readonly<{
  challenges: LoginChallengeRepository
  trustedDevices: TrustedDeviceRepository
  tokenService: TokenService
  events: AuthEventLog
  clock: Clock
}>

export type VerifyLoginCodeResult = Readonly<{
  /** Redeem for a session (Auth.js `authorize`). */
  grant: string
  /** Present when "remember this browser" was ticked; store in a cookie. */
  trustedDeviceToken?: string
}>

/**
 * Use case: second sign-in step. Throws
 * - CHALLENGE_INVALID: missing/closed challenge or attempts exhausted (start over),
 * - CODE_EXPIRED: the 3-minute code expired (resend),
 * - CODE_INVALID with `attemptsLeft`.
 */
export function makeVerifyLoginCode(deps: VerifyLoginCodeDeps) {
  const policy = AUTH_POLICY

  return async function verifyLoginCode(
    challengeToken: string | undefined,
    input: LoginCodeInput,
    meta: RequestMeta
  ): Promise<VerifyLoginCodeResult> {
    if (!challengeToken) throw new AuthError("CHALLENGE_INVALID")
    const { code, remember } = loginCodeSchema.parse(input)

    const now = deps.clock.now()
    const id = deps.tokenService.hashToken(challengeToken)
    const current = await deps.challenges.findById(id)
    if (!current || !isChallengeOpen(current, now)) {
      throw new AuthError("CHALLENGE_INVALID")
    }
    if (current.codeExpiresAt <= now) throw new AuthError("CODE_EXPIRED")

    // Count the attempt before comparing, atomically, so parallel guesses
    // cannot exceed the limit.
    const challenge = await deps.challenges.registerAttempt(
      id,
      now,
      policy.loginCodeMaxAttempts
    )
    if (!challenge?.codeHash) throw new AuthError("CHALLENGE_INVALID")

    const matches = deps.tokenService.safeEqual(
      deps.tokenService.hashCode(code),
      challenge.codeHash
    )
    if (!matches) {
      const attemptsLeft = policy.loginCodeMaxAttempts - challenge.attempts
      await deps.events.record({
        type: "login_code_failed",
        userId: challenge.userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
        meta: { attemptsLeft },
      })
      if (attemptsLeft <= 0) throw new AuthError("CHALLENGE_INVALID")
      throw new AuthError("CODE_INVALID", { attemptsLeft })
    }

    const grant = deps.tokenService.generateToken()
    const verified = await deps.challenges.markVerified(
      id,
      deps.tokenService.hashToken(grant),
      now
    )
    if (!verified) throw new AuthError("CHALLENGE_INVALID")

    if (!remember) return { grant }

    const trustedDeviceToken = deps.tokenService.generateToken()
    await deps.trustedDevices.create({
      userId: challenge.userId,
      tokenHash: deps.tokenService.hashToken(trustedDeviceToken),
      userAgent: meta.userAgent,
      expiresAt: new Date(now.getTime() + policy.trustedDeviceTtlMs),
      now,
    })
    await deps.events.record({
      type: "trusted_device_added",
      userId: challenge.userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    return { grant, trustedDeviceToken }
  }
}

export type VerifyLoginCode = ReturnType<typeof makeVerifyLoginCode>
