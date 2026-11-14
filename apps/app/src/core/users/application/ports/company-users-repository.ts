import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"
import type { UserStatus } from "@/core/auth/domain/user-status"
import type { ListPage, ListQuery } from "@/core/shared/list-query"

import type { MemberChangeError, SeatUsage } from "../../domain/membership"

export type Member = Readonly<{
  id: string
  email: string
  name: string | null
  /** E.164, or null. */
  phone: string | null
  /** Avatar background, a key of `USER_COLORS`. */
  color: string
  role: Role
  status: UserStatus
  lastLoginAt: Date | null
  createdAt: Date
}>

export const MEMBER_SORT_FIELDS = ["name", "email", "phone", "role"] as const
export type MemberSortField = (typeof MEMBER_SORT_FIELDS)[number]

export type MemberFilters = {
  /** Case-insensitive substring. */
  name: string
  email: string
  /** Digits only, matched as a substring of the stored E.164 number. */
  phone: string
  role: Role[]
}

export type MemberListQuery = ListQuery<MemberSortField, MemberFilters>

export type PendingInvitation = Readonly<{
  id: string
  email: string
  role: Role
  expiresAt: Date
  createdAt: Date
}>

export const INVITATION_SORT_FIELDS = ["email", "role", "expiresAt"] as const
export type InvitationSortField = (typeof INVITATION_SORT_FIELDS)[number]

export type InvitationFilters = {
  email: string
  role: Role[]
}

export type InvitationListQuery = ListQuery<
  InvitationSortField,
  InvitationFilters
>

export type CreateInvitationResult =
  /**
   * `existingAccount`: the email belongs to a user of ANOTHER company. The
   * invitation is still stored (and holds a seat) so the inviting tenant sees
   * exactly the same outcome as for a new address; only the email differs.
   */
  | { ok: true; companyName: string; existingAccount: boolean }
  /** EMAIL_TAKEN = already a user of the inviting company. */
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
  /** One page of members; DELETED (anonymized) accounts are never listed. */
  listMembers(
    ctx: TenantContext,
    query: MemberListQuery
  ): Promise<ListPage<Member>>

  listPendingInvitations(
    ctx: TenantContext,
    now: Date,
    query: InvitationListQuery
  ): Promise<ListPage<PendingInvitation>>

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

  /**
   * Admins are untouchable (ADMIN_PROTECTED) — this and the two methods below
   * refuse any change to a member whose role is ADMIN. LAST_ADMIN stays as a
   * second guard.
   */
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

  /**
   * Anonymizes a member (status DELETED): personal data wiped, email freed,
   * sessions and pending auth artefacts revoked. Same guards as `setActive`.
   */
  anonymize(
    ctx: TenantContext,
    userId: string,
    now: Date
  ): Promise<MemberChangeError | null>
}
