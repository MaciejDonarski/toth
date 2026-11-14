import { AUTH_POLICY } from "../domain/auth-policy"
import { maskEmail } from "../domain/email"
import type { Clock } from "./ports/clock"
import type {
  LoginChallenge,
  LoginChallengeRepository,
} from "./ports/login-challenge-repository"
import type { TokenService } from "./ports/token-service"
import type { UserAccountRepository } from "./ports/user-account-repository"
import type { ChallengeView } from "./start-login"

/** A challenge that still accepts codes (or a resend). */
export function isChallengeOpen(challenge: LoginChallenge, now: Date): boolean {
  return (
    !challenge.verifiedAt &&
    !challenge.consumedAt &&
    challenge.codeHash !== null &&
    challenge.expiresAt > now &&
    challenge.attempts < AUTH_POLICY.loginCodeMaxAttempts
  )
}

export function nextResendAt(challenge: LoginChallenge): Date {
  return new Date(
    challenge.lastSentAt.getTime() + AUTH_POLICY.loginCodeResendCooldownMs
  )
}

export type GetLoginChallengeDeps = Readonly<{
  users: UserAccountRepository
  challenges: LoginChallengeRepository
  tokenService: TokenService
  clock: Clock
}>

/**
 * Use case: what the code-entry page shows. Null when the challenge from the
 * cookie is missing or no longer open (the user must start over).
 */
export function makeGetLoginChallenge(deps: GetLoginChallengeDeps) {
  return async function getLoginChallenge(
    challengeToken: string | undefined
  ): Promise<ChallengeView | null> {
    if (!challengeToken) return null
    const challenge = await deps.challenges.findById(
      deps.tokenService.hashToken(challengeToken)
    )
    if (!challenge || !isChallengeOpen(challenge, deps.clock.now())) return null

    const user = await deps.users.findById(challenge.userId)
    if (!user) return null

    return {
      maskedEmail: maskEmail(user.email),
      codeExpiresAt: challenge.codeExpiresAt,
      nextResendAt: nextResendAt(challenge),
      resendsLeft: Math.max(
        0,
        AUTH_POLICY.loginCodeMaxResends - challenge.resendCount
      ),
    }
  }
}

export type GetLoginChallenge = ReturnType<typeof makeGetLoginChallenge>
