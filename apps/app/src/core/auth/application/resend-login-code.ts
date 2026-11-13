import { AUTH_POLICY } from "../domain/auth-policy"
import { AuthError } from "../domain/errors"
import { isChallengeOpen, nextResendAt } from "./login-challenge-view"
import type { AuthNotifier } from "./ports/auth-notifier"
import type { Clock } from "./ports/clock"
import type { LoginChallengeRepository } from "./ports/login-challenge-repository"
import type { TokenService } from "./ports/token-service"
import type { UserAccountRepository } from "./ports/user-account-repository"

export type ResendLoginCodeDeps = Readonly<{
  users: UserAccountRepository
  challenges: LoginChallengeRepository
  tokenService: TokenService
  notifier: AuthNotifier
  clock: Clock
}>

/**
 * Use case: email a fresh code for an open challenge. The old code stops
 * working and the 3-minute validity restarts. Attempts are not reset.
 */
export function makeResendLoginCode(deps: ResendLoginCodeDeps) {
  const policy = AUTH_POLICY

  return async function resendLoginCode(challengeToken: string | undefined) {
    if (!challengeToken) throw new AuthError("CHALLENGE_INVALID")
    const now = deps.clock.now()
    const challenge = await deps.challenges.findById(
      deps.tokenService.hashToken(challengeToken)
    )
    if (!challenge || !isChallengeOpen(challenge, now)) {
      throw new AuthError("CHALLENGE_INVALID")
    }
    if (challenge.resendCount >= policy.loginCodeMaxResends) {
      throw new AuthError("RESEND_LIMIT_REACHED")
    }
    const availableAt = nextResendAt(challenge)
    if (availableAt > now) {
      throw new AuthError("RESEND_TOO_SOON", { retryAt: availableAt })
    }

    const user = await deps.users.findById(challenge.userId)
    if (!user || user.status !== "ACTIVE") {
      throw new AuthError("CHALLENGE_INVALID")
    }

    const code = deps.tokenService.generateCode(policy.loginCodeLength)
    const codeExpiresAt = new Date(now.getTime() + policy.loginCodeTtlMs)
    const replaced = await deps.challenges.replaceCode({
      id: challenge.id,
      codeHash: deps.tokenService.hashCode(code),
      codeExpiresAt,
      now,
      expectedResendCount: challenge.resendCount,
    })
    // Lost a race with a concurrent resend: that one already sent a code.
    if (!replaced) throw new AuthError("RESEND_TOO_SOON")

    await deps.notifier.sendLoginCode(user.email, {
      code,
      validForMs: policy.loginCodeTtlMs,
    })

    return {
      codeExpiresAt,
      nextResendAt: new Date(now.getTime() + policy.loginCodeResendCooldownMs),
      resendsLeft: policy.loginCodeMaxResends - challenge.resendCount - 1,
    }
  }
}

export type ResendLoginCode = ReturnType<typeof makeResendLoginCode>
