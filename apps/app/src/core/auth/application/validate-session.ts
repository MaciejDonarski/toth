import { AUTH_POLICY } from "../domain/auth-policy"
import { permissionsFor, type Permission } from "../domain/permissions"
import type { Role } from "../domain/role"
import type { TenantContext } from "../domain/tenant-context"
import type { AuthEventLog } from "./ports/auth-event-log"
import type { Clock } from "./ports/clock"
import type { SessionRepository } from "./ports/session-repository"
import type { TokenService } from "./ports/token-service"
import type { RequestMeta } from "./request-meta"

/** The signed-in user, as exposed to pages, actions and navigation. */
export type CurrentUser = Readonly<{
  id: string
  companyId: string
  email: string
  name: string | null
  role: Role
  permissions: readonly Permission[]
}>

export function toTenantContext(user: CurrentUser): TenantContext {
  return { userId: user.id, companyId: user.companyId, role: user.role }
}

export type ValidateSessionDeps = Readonly<{
  sessions: SessionRepository
  tokenService: TokenService
  clock: Clock
}>

/**
 * Use case: resolve the session id from the JWT against the database. This
 * is the real authentication check behind every page and action — the
 * cookie alone proves nothing once a session is revoked, idle, expired, the
 * user is disabled or their password changed.
 */
export function makeValidateSession(deps: ValidateSessionDeps) {
  return async function validateSession(
    sessionId: string | undefined
  ): Promise<CurrentUser | null> {
    if (!sessionId) return null
    const now = deps.clock.now()
    const id = deps.tokenService.hashToken(sessionId)
    const session = await deps.sessions.findById(id)
    if (!session) return null

    const { user } = session
    const idleFor = now.getTime() - session.lastSeenAt.getTime()
    const valid =
      !session.revokedAt &&
      session.absoluteExpiresAt > now &&
      idleFor < AUTH_POLICY.sessionIdleTimeoutMs &&
      user.status === "ACTIVE" &&
      // A password change ends every session not re-authenticated after it.
      user.passwordChangedAt <= session.authenticatedAt
    if (!valid) return null

    if (idleFor >= AUTH_POLICY.sessionTouchThrottleMs) {
      await deps.sessions.touch(id, now)
    }

    return {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: permissionsFor(user.role),
    }
  }
}

export type ValidateSession = ReturnType<typeof makeValidateSession>

export type RevokeSessionDeps = Readonly<{
  sessions: SessionRepository
  tokenService: TokenService
  events: AuthEventLog
  clock: Clock
}>

/** Use case: sign out — the session stops working everywhere immediately. */
export function makeRevokeSession(deps: RevokeSessionDeps) {
  return async function revokeSession(
    sessionId: string | undefined,
    user: CurrentUser | null,
    meta: RequestMeta
  ): Promise<void> {
    if (!sessionId) return
    await deps.sessions.revoke(
      deps.tokenService.hashToken(sessionId),
      deps.clock.now()
    )
    await deps.events.record({
      type: "logout",
      userId: user?.id,
      companyId: user?.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
  }
}

export type RevokeSession = ReturnType<typeof makeRevokeSession>
