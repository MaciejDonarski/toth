import type { PasswordResetStore } from "@/core/auth/application/ports/password-reset-store"
import type { PrismaClient } from "@/generated/prisma/client"

export class PrismaPasswordResetStore implements PasswordResetStore {
  constructor(private readonly db: PrismaClient) {}

  resetWithToken(input: {
    tokenHash: string
    passwordHash: string
    now: Date
  }): Promise<{ userId: string; companyId: string; email: string } | null> {
    const { tokenHash, passwordHash, now } = input

    return this.db.$transaction(async (tx) => {
      // Conditional update = atomic single use, even for parallel submits.
      const { count } = await tx.authToken.updateMany({
        where: {
          tokenHash,
          type: "PASSWORD_RESET",
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      })
      if (count !== 1) return null

      const { userId } = await tx.authToken.findUniqueOrThrow({
        where: { tokenHash },
        select: { userId: true },
      })

      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { emailVerifiedAt: true },
      })
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
          failedLoginCount: 0,
          lockedUntil: null,
          // Opening the emailed link proves ownership of the address.
          emailVerifiedAt: current.emailVerifiedAt ?? now,
        },
        select: { id: true, companyId: true, email: true },
      })

      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      })
      await tx.trustedDevice.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      })
      await tx.loginChallenge.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: now },
      })
      // Any other outstanding reset links die with this one.
      await tx.authToken.updateMany({
        where: { userId, type: "PASSWORD_RESET", consumedAt: null },
        data: { consumedAt: now },
      })

      return { userId: user.id, companyId: user.companyId, email: user.email }
    })
  }
}
