import type { AuthEventLog } from "@/core/auth/application/ports/auth-event-log"
import type { AuthNotifier } from "@/core/auth/application/ports/auth-notifier"
import type { Clock } from "@/core/auth/application/ports/clock"
import type { PasswordHasher } from "@/core/auth/application/ports/password-hasher"
import type { RateLimiter } from "@/core/auth/application/ports/rate-limiter"
import type { TokenService } from "@/core/auth/application/ports/token-service"
import { enforceRateLimit } from "@/core/auth/application/rate-limit"
import type { RequestMeta } from "@/core/auth/application/request-meta"
import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { normalizeEmail } from "@/core/auth/domain/email"
import { AuthError } from "@/core/auth/domain/errors"
import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

import type { MemberChangeError } from "../domain/membership"
import { assertCan } from "./assert-can"
import type {
  CompanyUsersRepository,
  Member,
  PendingInvitation,
} from "./ports/company-users-repository"
import type {
  InvitationAcceptanceStore,
  OpenInvitation,
} from "./ports/invitation-acceptance-store"
import {
  acceptInvitationSchema,
  inviteUserSchema,
  memberIdSchema,
  roleSchema,
  type AcceptInvitationInput,
  type InviteUserInput,
} from "./schemas"

export class MemberChangeRefused extends Error {
  constructor(readonly reason: MemberChangeError) {
    super(reason)
    this.name = "MemberChangeRefused"
  }
}

export type CompanyUsersDeps = Readonly<{
  companyUsers: CompanyUsersRepository
  tokenService: TokenService
  rateLimiter: RateLimiter
  notifier: AuthNotifier
  events: AuthEventLog
  clock: Clock
}>

export type CompanyUsersOverview = Readonly<{
  members: Member[]
  invitations: PendingInvitation[]
  seats: { used: number; limit: number }
}>

export function makeCompanyUsers(deps: CompanyUsersDeps) {
  const { companyUsers: repo } = deps

  function record(
    ctx: TenantContext,
    type: Parameters<AuthEventLog["record"]>[0]["type"],
    meta: RequestMeta,
    details?: Record<string, unknown>
  ) {
    return deps.events.record({
      type,
      userId: ctx.userId,
      companyId: ctx.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: details,
    })
  }

  return {
    /** Members, pending invitations and seat usage of the caller's company. */
    async overview(ctx: TenantContext): Promise<CompanyUsersOverview> {
      assertCan(ctx, "users.view")
      const now = deps.clock.now()
      const [members, invitations, seats] = await Promise.all([
        repo.listMembers(ctx),
        repo.listPendingInvitations(ctx, now),
        repo.seatUsage(ctx, now),
      ])
      return { members, invitations, seats }
    },

    /** Throws USER_LIMIT_REACHED, EMAIL_TAKEN, RATE_LIMITED or FORBIDDEN. */
    async invite(
      ctx: TenantContext,
      input: InviteUserInput,
      meta: RequestMeta
    ) {
      assertCan(ctx, "users.invite")
      const { email, role } = inviteUserSchema.parse(input)

      await enforceRateLimit(deps.rateLimiter, {
        key: `invite:company:${ctx.companyId}`,
        ...AUTH_POLICY.rateLimits.invitationsPerCompany,
      })

      const now = deps.clock.now()
      const token = deps.tokenService.generateToken()
      const result = await repo.createInvitation(ctx, {
        email,
        role,
        tokenHash: deps.tokenService.hashToken(token),
        expiresAt: new Date(now.getTime() + AUTH_POLICY.invitationTtlMs),
        now,
      })
      if (!result.ok) throw new AuthError(result.error)

      await deps.notifier.sendInvitation(email, {
        token,
        companyName: result.companyName,
        validForMs: AUTH_POLICY.invitationTtlMs,
      })
      await record(ctx, "invitation_sent", meta, { email, role })
    },

    async revokeInvitation(
      ctx: TenantContext,
      invitationId: string,
      meta: RequestMeta
    ) {
      assertCan(ctx, "users.invite")
      const id = memberIdSchema.parse(invitationId)
      const revoked = await repo.revokeInvitation(ctx, id, deps.clock.now())
      if (!revoked) throw new MemberChangeRefused("NOT_FOUND")
      await record(ctx, "invitation_revoked", meta, { invitationId: id })
    },

    async changeRole(
      ctx: TenantContext,
      userId: string,
      role: Role,
      meta: RequestMeta
    ) {
      assertCan(ctx, "users.manage")
      const id = memberIdSchema.parse(userId)
      const newRole = roleSchema.parse(role)
      if (id === ctx.userId) throw new MemberChangeRefused("SELF_CHANGE")

      const refused = await repo.changeRole(ctx, id, newRole)
      if (refused) throw new MemberChangeRefused(refused)
      await record(ctx, "member_role_changed", meta, {
        memberId: id,
        role: newRole,
      })
    },

    async setActive(
      ctx: TenantContext,
      userId: string,
      active: boolean,
      meta: RequestMeta
    ) {
      assertCan(ctx, "users.manage")
      const id = memberIdSchema.parse(userId)
      if (id === ctx.userId) throw new MemberChangeRefused("SELF_CHANGE")

      const refused = await repo.setActive(ctx, id, active, deps.clock.now())
      if (refused) throw new MemberChangeRefused(refused)
      await record(ctx, active ? "member_enabled" : "member_disabled", meta, {
        memberId: id,
      })
    },
  }
}

export type CompanyUsers = ReturnType<typeof makeCompanyUsers>

export type InvitationAcceptanceDeps = Readonly<{
  acceptances: InvitationAcceptanceStore
  passwordHasher: PasswordHasher
  tokenService: TokenService
  events: AuthEventLog
  clock: Clock
}>

export function makeInvitationAcceptance(deps: InvitationAcceptanceDeps) {
  return {
    /** What the accept page shows; null for unknown/used/expired/revoked links. */
    async find(token: string | undefined): Promise<OpenInvitation | null> {
      if (!token) return null
      return deps.acceptances.findOpen(
        deps.tokenService.hashToken(token),
        deps.clock.now()
      )
    },

    /** Throws TOKEN_INVALID, USER_LIMIT_REACHED or EMAIL_TAKEN. */
    async accept(
      token: string | undefined,
      input: AcceptInvitationInput,
      meta: RequestMeta
    ): Promise<{ email: string }> {
      if (!token) throw new AuthError("TOKEN_INVALID")
      const data = acceptInvitationSchema.parse(input)

      const result = await deps.acceptances.accept({
        tokenHash: deps.tokenService.hashToken(token),
        name: data.name,
        passwordHash: await deps.passwordHasher.hash(data.password),
        termsVersion: AUTH_POLICY.termsVersion,
        now: deps.clock.now(),
      })
      if (!result.ok) throw new AuthError(result.error)

      await deps.events.record({
        type: "invitation_accepted",
        userId: result.userId,
        companyId: result.companyId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
      return { email: normalizeEmail(result.email) }
    },
  }
}

export type InvitationAcceptance = ReturnType<typeof makeInvitationAcceptance>
