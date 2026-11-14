import { AuthError } from "../domain/errors"
import type { AuthEventLog } from "./ports/auth-event-log"
import type { AuthTokenRepository } from "./ports/auth-token-repository"
import type { Clock } from "./ports/clock"
import type { TokenService } from "./ports/token-service"
import type { UserAccountRepository } from "./ports/user-account-repository"
import type { RequestMeta } from "./request-meta"

export type VerifyEmailDeps = Readonly<{
  users: UserAccountRepository
  authTokens: AuthTokenRepository
  tokenService: TokenService
  events: AuthEventLog
  clock: Clock
}>

/**
 * Use case: confirm an email address from the link in the verification mail.
 * Throws TOKEN_INVALID for unknown, used or expired tokens.
 */
export function makeVerifyEmail(deps: VerifyEmailDeps) {
  return async function verifyEmail(
    token: string,
    meta: RequestMeta
  ): Promise<void> {
    if (!token) throw new AuthError("TOKEN_INVALID")

    const now = deps.clock.now()
    const consumed = await deps.authTokens.consume(
      deps.tokenService.hashToken(token),
      "EMAIL_VERIFICATION",
      now
    )
    if (!consumed) throw new AuthError("TOKEN_INVALID")

    const user = await deps.users.findById(consumed.userId)
    if (!user) throw new AuthError("TOKEN_INVALID")

    await deps.users.markEmailVerified(user.id, now)
    await deps.events.record({
      type: "email_verified",
      userId: user.id,
      companyId: user.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
  }
}

export type VerifyEmail = ReturnType<typeof makeVerifyEmail>
