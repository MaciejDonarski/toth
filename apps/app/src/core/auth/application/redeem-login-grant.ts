import { AUTH_POLICY } from "../domain/auth-policy"
import type { AuthEventLog } from "./ports/auth-event-log"
import type { Clock } from "./ports/clock"
import type { LoginChallengeRepository } from "./ports/login-challenge-repository"
import type { SessionRepository } from "./ports/session-repository"
import type { TokenService } from "./ports/token-service"
import type { UserAccountRepository } from "./ports/user-account-repository"
import type { RequestMeta } from "./request-meta"

export type RedeemLoginGrantDeps = Readonly<{
  users: UserAccountRepository
  challenges: LoginChallengeRepository
  sessions: SessionRepository
  tokenService: TokenService
  events: AuthEventLog
  clock: Clock
}>

/**
 * Use case: exchange a single-use grant (from a verified challenge) for a new
 * server-side session. Returns the plain session id to put into the JWT, or
 * null when the grant is unknown, used, older than 60 s, or the user can no
 * longer sign in.
 */
export function makeRedeemLoginGrant(deps: RedeemLoginGrantDeps) {
  return async function redeemLoginGrant(
    grant: string,
    meta: RequestMeta
  ): Promise<{ userId: string; sessionId: string } | null> {
    if (!grant) return null
    const now = deps.clock.now()

    const redeemed = await deps.challenges.consumeGrant(
      deps.tokenService.hashToken(grant),
      now,
      new Date(now.getTime() - AUTH_POLICY.loginGrantTtlMs)
    )
    if (!redeemed) return null

    const user = await deps.users.findById(redeemed.userId)
    if (!user || user.status !== "ACTIVE" || !user.emailVerifiedAt) return null

    const sessionId = deps.tokenService.generateToken()
    await deps.sessions.create({
      id: deps.tokenService.hashToken(sessionId),
      userId: user.id,
      companyId: user.companyId,
      absoluteExpiresAt: new Date(
        now.getTime() + AUTH_POLICY.sessionAbsoluteTtlMs
      ),
      viaTrustedDevice: redeemed.viaTrustedDevice,
      now,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    await deps.users.recordLogin(user.id, now)
    await deps.events.record({
      type: "login_success",
      userId: user.id,
      companyId: user.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: { viaTrustedDevice: redeemed.viaTrustedDevice },
    })

    return { userId: user.id, sessionId }
  }
}

export type RedeemLoginGrant = ReturnType<typeof makeRedeemLoginGrant>
