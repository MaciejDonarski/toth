import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

import type { MemberChangeError, SeatUsage } from "../../domain/membership"

export type Member = Readonly<{
  id: string
  email: string
  name: string | null
  /** E.164, or null. */
  phone: string | null
  role: Role
  status: "ACTIVE" | "DISABLED"
  lastLoginAt: Date | null
  createdAt: Date
}>

export type PendingInvitation = Readonly<{
  id: string
  email: string
  role: Role
  expiresAt: Date
  createdAt: Date
}>

export type CreateInvitationResult =
  | { ok: true; companyName: string }
  | { ok: false; error: "USER_LIMIT_REACHED" | "EMAIL_TAKEN" }

/**
 * Tenant-scoped access to a company's users and invitations.
 *
 * EVERY method takes the caller's TenantContext first and only ever reads or
 * writes rows of `ctx.companyId`. Ids from the request are always matched
 * together with the company id, so an id from another company behaves like
 * an unknown id (covered by the A/B isolation tests).
 */
export interface CompanyUsersRepository {
  listMembers(ctx: TenantContext): Promise<Member[]>

  listPendingInvitations(
    ctx: TenantContext,
    now: Date
  ): Promise<PendingInvitation[]>

  seatUsage(ctx: TenantContext, now: Date): Promise<SeatUsage>

  /**
   * Under a lock on the company row: refuses when no seat is free or the
   * email already has an account; replaces an earlier invitation for the
   * same email (new token and expiry).
   */
  createInvitation(
    ctx: TenantContext,
    input: {
      email: string
      role: Role
      tokenHash: string
      expiresAt: Date
      now: Date
    }
  ): Promise<CreateInvitationResult>

  /** False when the invitation is unknown, accepted or of another company. */
  revokeInvitation(
    ctx: TenantContext,
    invitationId: string,
    now: Date
  ): Promise<boolean>

  /** Keeps at least one active admin; refuses to change the caller. */
  changeRole(
    ctx: TenantContext,
    userId: string,
    role: Role
  ): Promise<MemberChangeError | null>

  /**
   * Disabling revokes the member's sessions and trusted devices; enabling
   * needs a free seat. Same guards as `changeRole`.
   */
  setActive(
    ctx: TenantContext,
    userId: string,
    active: boolean,
    now: Date
  ): Promise<MemberChangeError | null>
}
