import type {
  AcceptInvitationResult,
  InvitationAcceptanceStore,
  OpenInvitation,
} from "@/core/users/application/ports/invitation-acceptance-store"
import { Prisma, type PrismaClient } from "@/generated/prisma/client"

export class PrismaInvitationAcceptanceStore implements InvitationAcceptanceStore {
  constructor(private readonly db: PrismaClient) {}

  async findOpen(tokenHash: string, now: Date): Promise<OpenInvitation | null> {
    const invitation = await this.db.invitation.findFirst({
      where: {
        tokenHash,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        email: true,
        role: true,
        expiresAt: true,
        company: { select: { name: true } },
      },
    })
    return invitation
      ? {
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          companyName: invitation.company.name,
        }
      : null
  }

  async accept(input: {
    tokenHash: string
    name: string
    passwordHash: string
    termsVersion: string
    now: Date
  }): Promise<AcceptInvitationResult> {
    const { tokenHash, now } = input
    try {
      return await this.db.$transaction(async (tx) => {
        const target = await tx.invitation.findUnique({
          where: { tokenHash },
          select: { companyId: true },
        })
        if (!target) return { ok: false, error: "TOKEN_INVALID" } as const

        // Same lock as invitations and member changes in this company.
        const [company] = await tx.$queryRaw<{ userLimit: number }[]>`
          SELECT "userLimit" FROM "Company" WHERE "id" = ${target.companyId} FOR UPDATE
        `
        if (!company) return { ok: false, error: "TOKEN_INVALID" } as const

        const invitation = await tx.invitation.findFirst({
          where: {
            tokenHash,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          select: { id: true, companyId: true, email: true, role: true },
        })
        if (!invitation) return { ok: false, error: "TOKEN_INVALID" } as const

        if (
          await tx.user.findUnique({
            where: { email: invitation.email },
            select: { id: true },
          })
        ) {
          return { ok: false, error: "EMAIL_TAKEN" } as const
        }
        const active = await tx.user.count({
          where: { companyId: invitation.companyId, status: "ACTIVE" },
        })
        if (active >= company.userLimit) {
          return { ok: false, error: "USER_LIMIT_REACHED" } as const
        }

        const { count } = await tx.invitation.updateMany({
          where: { id: invitation.id, acceptedAt: null, revokedAt: null },
          data: { acceptedAt: now },
        })
        if (count !== 1) return { ok: false, error: "TOKEN_INVALID" } as const

        const user = await tx.user.create({
          data: {
            companyId: invitation.companyId,
            email: invitation.email,
            name: input.name,
            passwordHash: input.passwordHash,
            role: invitation.role,
            // The invitation link went to this address.
            emailVerifiedAt: now,
            passwordChangedAt: now,
            termsAcceptedAt: now,
            termsVersion: input.termsVersion,
            createdAt: now,
          },
          select: { id: true, companyId: true, email: true },
        })
        return {
          ok: true,
          userId: user.id,
          companyId: user.companyId,
          email: user.email,
        } as const
      })
    } catch (error) {
      // Someone registered this email between our check and the insert.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { ok: false, error: "EMAIL_TAKEN" }
      }
      throw error
    }
  }
}
