import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"
import type { ListPage } from "@/core/shared/list-query"
import type {
  CompanyUsersRepository,
  CreateInvitationResult,
  InvitationListQuery,
  InvitationSortField,
  Member,
  MemberListQuery,
  MemberSortField,
  PendingInvitation,
} from "@/core/users/application/ports/company-users-repository"
import type {
  MemberChangeError,
  SeatUsage,
} from "@/core/users/domain/membership"
import type { Prisma } from "@/generated/prisma/client"
import {
  containsInsensitive,
  inList,
  toOrderBy,
  toSkipTake,
} from "@/infrastructure/db/list-query"
import { withTenant } from "@/infrastructure/db/with-tenant"

type Tx = Prisma.TransactionClient

/** Row lock on the tenant's company: serializes seat and admin checks. */
async function lockCompany(tx: Tx, companyId: string) {
  const rows = await tx.$queryRaw<{ name: string; userLimit: number }[]>`
    SELECT "name", "userLimit" FROM "Company" WHERE "id" = ${companyId} FOR UPDATE
  `
  const company = rows[0]
  if (!company) throw new Error("Tenant company not found")
  return company
}

function pendingWhere(companyId: string, now: Date) {
  return {
    companyId,
    acceptedAt: null,
    revokedAt: null,
    expiresAt: { gt: now },
  } satisfies Prisma.InvitationWhereInput
}

async function countSeats(tx: Tx, companyId: string, now: Date) {
  const [active, pending] = await Promise.all([
    tx.user.count({ where: { companyId, status: "ACTIVE" } }),
    tx.invitation.count({ where: pendingWhere(companyId, now) }),
  ])
  return active + pending
}

/** Would this change leave the company without an active admin? */
async function removesLastAdmin(
  tx: Tx,
  companyId: string,
  target: { role: Role; status: string }
) {
  if (target.role !== "ADMIN" || target.status !== "ACTIVE") return false
  const admins = await tx.user.count({
    where: { companyId, role: "ADMIN", status: "ACTIVE" },
  })
  return admins <= 1
}

/** The guard every member change runs first, under the company lock. */
async function findChangeable(
  tx: Tx,
  companyId: string,
  userId: string
): Promise<
  | { ok: true; target: { role: Role; status: string } }
  | { ok: false; error: MemberChangeError }
> {
  const target = await tx.user.findFirst({
    where: { id: userId, companyId, status: { not: "DELETED" } },
    select: { role: true, status: true },
  })
  if (!target) return { ok: false, error: "NOT_FOUND" }
  if (target.role === "ADMIN") return { ok: false, error: "ADMIN_PROTECTED" }
  return { ok: true, target }
}

/** Out immediately, everywhere: sessions, trusted browsers, pending 2FA, reset links. */
async function revokeAccess(
  tx: Tx,
  companyId: string,
  userId: string,
  now: Date
) {
  await tx.session.updateMany({
    where: { userId, companyId, revokedAt: null },
    data: { revokedAt: now },
  })
  await tx.trustedDevice.updateMany({
    where: { userId, revokedAt: null, user: { companyId } },
    data: { revokedAt: now },
  })
  await tx.loginChallenge.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: now },
  })
  await tx.authToken.updateMany({
    where: { userId, type: "PASSWORD_RESET", consumedAt: null },
    data: { consumedAt: now },
  })
}

const MEMBER_ORDER: Record<
  MemberSortField,
  (dir: Prisma.SortOrder) => Prisma.UserOrderByWithRelationInput
> = {
  name: (dir) => ({ name: { sort: dir, nulls: "last" } }),
  email: (dir) => ({ email: dir }),
  phone: (dir) => ({ phone: { sort: dir, nulls: "last" } }),
  role: (dir) => ({ role: dir }),
}

const INVITATION_ORDER: Record<
  InvitationSortField,
  (dir: Prisma.SortOrder) => Prisma.InvitationOrderByWithRelationInput
> = {
  email: (dir) => ({ email: dir }),
  role: (dir) => ({ role: dir }),
  expiresAt: (dir) => ({ expiresAt: dir }),
}

export class PrismaCompanyUsersRepository implements CompanyUsersRepository {
  listMembers(
    ctx: TenantContext,
    query: MemberListQuery
  ): Promise<ListPage<Member>> {
    const { filters } = query
    const phoneDigits = filters.phone?.replace(/\D/g, "")
    const where = {
      companyId: ctx.companyId,
      status: { not: "DELETED" },
      name: containsInsensitive(filters.name),
      email: containsInsensitive(filters.email),
      phone: phoneDigits ? { contains: phoneDigits } : undefined,
      role: inList(filters.role),
    } satisfies Prisma.UserWhereInput

    return withTenant(ctx, async (db) => {
      const [items, total] = await Promise.all([
        db.user.findMany({
          where,
          orderBy: toOrderBy(query.sort, MEMBER_ORDER, [
            { createdAt: "asc" },
            { id: "asc" },
          ]),
          ...toSkipTake(query),
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            color: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        db.user.count({ where }),
      ])
      return { items, total }
    })
  }

  listPendingInvitations(
    ctx: TenantContext,
    now: Date,
    query: InvitationListQuery
  ): Promise<ListPage<PendingInvitation>> {
    const where = {
      ...pendingWhere(ctx.companyId, now),
      email: containsInsensitive(query.filters.email),
      role: inList(query.filters.role),
    } satisfies Prisma.InvitationWhereInput

    return withTenant(ctx, async (db) => {
      const [items, total] = await Promise.all([
        db.invitation.findMany({
          where,
          orderBy: toOrderBy(query.sort, INVITATION_ORDER, [
            { createdAt: "asc" },
            { id: "asc" },
          ]),
          ...toSkipTake(query),
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        }),
        db.invitation.count({ where }),
      ])
      return { items, total }
    })
  }

  seatUsage(ctx: TenantContext, now: Date): Promise<SeatUsage> {
    return withTenant(ctx, async (db) => {
      const company = await db.company.findUniqueOrThrow({
        where: { id: ctx.companyId },
        select: { userLimit: true },
      })
      const used = await countSeats(db, ctx.companyId, now)
      return { used, limit: company.userLimit }
    })
  }

  createInvitation(
    ctx: TenantContext,
    input: {
      email: string
      role: Role
      tokenHash: string
      expiresAt: Date
      now: Date
    }
  ): Promise<CreateInvitationResult> {
    return withTenant(ctx, (db) =>
      db.$transaction(async (tx) => {
        const company = await lockCompany(tx, ctx.companyId)

        // Emails are unique across all companies, but only a member of THIS
        // company may be reported: anything else would tell the tenant that
        // the address has an account elsewhere (enumeration).
        const owner = await tx.user.findUnique({
          where: { email: input.email },
          select: { companyId: true },
        })
        if (owner?.companyId === ctx.companyId) {
          return { ok: false, error: "EMAIL_TAKEN" } as const
        }

        const existing = await tx.invitation.findUnique({
          where: {
            companyId_email: { companyId: ctx.companyId, email: input.email },
          },
          select: { acceptedAt: true, revokedAt: true, expiresAt: true },
        })
        const holdsSeat =
          !!existing &&
          !existing.acceptedAt &&
          !existing.revokedAt &&
          existing.expiresAt > input.now

        if (!holdsSeat) {
          const used = await countSeats(tx, ctx.companyId, input.now)
          if (used >= company.userLimit) {
            return { ok: false, error: "USER_LIMIT_REACHED" } as const
          }
        }

        const data = {
          role: input.role,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          invitedById: ctx.userId,
          createdAt: input.now,
          acceptedAt: null,
          revokedAt: null,
        }
        await tx.invitation.upsert({
          where: {
            companyId_email: { companyId: ctx.companyId, email: input.email },
          },
          create: { ...data, companyId: ctx.companyId, email: input.email },
          update: data,
        })
        return {
          ok: true,
          companyName: company.name,
          existingAccount: !!owner,
        } as const
      })
    )
  }

  revokeInvitation(
    ctx: TenantContext,
    invitationId: string,
    now: Date
  ): Promise<boolean> {
    return withTenant(ctx, async (db) => {
      const { count } = await db.invitation.updateMany({
        where: {
          id: invitationId,
          companyId: ctx.companyId,
          acceptedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      })
      return count === 1
    })
  }

  changeRole(
    ctx: TenantContext,
    userId: string,
    role: Role
  ): Promise<MemberChangeError | null> {
    return withTenant(ctx, (db) =>
      db.$transaction(async (tx) => {
        await lockCompany(tx, ctx.companyId)
        const found = await findChangeable(tx, ctx.companyId, userId)
        if (!found.ok) return found.error
        const { target } = found
        if (
          role !== "ADMIN" &&
          (await removesLastAdmin(tx, ctx.companyId, target))
        ) {
          return "LAST_ADMIN"
        }
        await tx.user.updateMany({
          where: { id: userId, companyId: ctx.companyId },
          data: { role },
        })
        return null
      })
    )
  }

  setActive(
    ctx: TenantContext,
    userId: string,
    active: boolean,
    now: Date
  ): Promise<MemberChangeError | null> {
    return withTenant(ctx, (db) =>
      db.$transaction(async (tx) => {
        const company = await lockCompany(tx, ctx.companyId)
        const found = await findChangeable(tx, ctx.companyId, userId)
        if (!found.ok) return found.error
        const { target } = found
        if (target.status === (active ? "ACTIVE" : "DISABLED")) return null

        if (active) {
          const used = await countSeats(tx, ctx.companyId, now)
          if (used >= company.userLimit) return "USER_LIMIT_REACHED"
        } else if (await removesLastAdmin(tx, ctx.companyId, target)) {
          return "LAST_ADMIN"
        }

        await tx.user.updateMany({
          where: { id: userId, companyId: ctx.companyId },
          data: { status: active ? "ACTIVE" : "DISABLED" },
        })
        if (!active) await revokeAccess(tx, ctx.companyId, userId, now)
        return null
      })
    )
  }

  anonymize(
    ctx: TenantContext,
    userId: string,
    now: Date
  ): Promise<MemberChangeError | null> {
    return withTenant(ctx, (db) =>
      db.$transaction(async (tx) => {
        await lockCompany(tx, ctx.companyId)
        const found = await findChangeable(tx, ctx.companyId, userId)
        if (!found.ok) return found.error
        if (await removesLastAdmin(tx, ctx.companyId, found.target)) {
          return "LAST_ADMIN"
        }

        await revokeAccess(tx, ctx.companyId, userId, now)
        await tx.workingHours.deleteMany({ where: { userId } })
        await tx.user.updateMany({
          where: { id: userId, companyId: ctx.companyId },
          data: {
            // Frees the real address (unique across companies) for a future
            // invite; `.invalid` is reserved and can never receive mail.
            email: `deleted+${userId}@deleted.invalid`,
            name: null,
            phone: null,
            // Not a hash any verifier can match.
            passwordHash: "!deleted",
            status: "DELETED",
            deletedAt: now,
            emailVerifiedAt: null,
            lockedUntil: null,
            failedLoginCount: 0,
          },
        })
        return null
      })
    )
  }
}
