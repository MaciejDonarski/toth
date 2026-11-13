import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"
import type {
  CompanyUsersRepository,
  CreateInvitationResult,
  Member,
  PendingInvitation,
} from "@/core/users/application/ports/company-users-repository"
import type {
  MemberChangeError,
  SeatUsage,
} from "@/core/users/domain/membership"
import type { Prisma } from "@/generated/prisma/client"
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

export class PrismaCompanyUsersRepository implements CompanyUsersRepository {
  listMembers(ctx: TenantContext): Promise<Member[]> {
    return withTenant(ctx, (db) =>
      db.user.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      })
    )
  }

  listPendingInvitations(
    ctx: TenantContext,
    now: Date
  ): Promise<PendingInvitation[]> {
    return withTenant(ctx, (db) =>
      db.invitation.findMany({
        where: pendingWhere(ctx.companyId, now),
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      })
    )
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

        // Emails are unique across all companies.
        if (
          await tx.user.findUnique({
            where: { email: input.email },
            select: { id: true },
          })
        ) {
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
        return { ok: true, companyName: company.name } as const
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
        const target = await tx.user.findFirst({
          where: { id: userId, companyId: ctx.companyId },
          select: { role: true, status: true },
        })
        if (!target) return "NOT_FOUND"
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
        const target = await tx.user.findFirst({
          where: { id: userId, companyId: ctx.companyId },
          select: { role: true, status: true },
        })
        if (!target) return "NOT_FOUND"
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
        if (!active) {
          // Out immediately, everywhere.
          await tx.session.updateMany({
            where: { userId, companyId: ctx.companyId, revokedAt: null },
            data: { revokedAt: now },
          })
          await tx.trustedDevice.updateMany({
            where: {
              userId,
              revokedAt: null,
              user: { companyId: ctx.companyId },
            },
            data: { revokedAt: now },
          })
        }
        return null
      })
    )
  }
}
