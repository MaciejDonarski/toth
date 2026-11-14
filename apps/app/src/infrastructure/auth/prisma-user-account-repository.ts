import type {
  UserAccount,
  UserAccountRepository,
} from "@/core/auth/application/ports/user-account-repository"
import type { PrismaClient } from "@/generated/prisma/client"

const ACCOUNT_SELECT = {
  id: true,
  companyId: true,
  email: true,
  name: true,
  role: true,
  status: true,
  passwordHash: true,
  emailVerifiedAt: true,
  passwordChangedAt: true,
  failedLoginCount: true,
  lockedUntil: true,
} as const

export class PrismaUserAccountRepository implements UserAccountRepository {
  constructor(private readonly db: PrismaClient) {}

  findByEmail(email: string): Promise<UserAccount | null> {
    return this.db.user.findUnique({
      where: { email },
      select: ACCOUNT_SELECT,
    })
  }

  findById(id: string): Promise<UserAccount | null> {
    return this.db.user.findUnique({ where: { id }, select: ACCOUNT_SELECT })
  }

  async markEmailVerified(userId: string, at: Date): Promise<void> {
    await this.db.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: at },
    })
  }

  async recordFailedLogin(input: {
    userId: string
    now: Date
    maxAttempts: number
    lockoutMs: number
  }): Promise<{ lockedUntil: Date | null }> {
    const lockedUntil = new Date(input.now.getTime() + input.lockoutMs)
    // One atomic statement: increment, and lock + reset the counter when the
    // limit is reached, so concurrent failures cannot skip the lock.
    // After an increment the counter is >= 1, so 0 means "just locked".
    const rows = await this.db.$queryRaw<{ locked: boolean }[]>`
      UPDATE "User" SET
        "failedLoginCount" = CASE WHEN "failedLoginCount" + 1 >= ${input.maxAttempts}
                                  THEN 0 ELSE "failedLoginCount" + 1 END,
        "lockedUntil" = CASE WHEN "failedLoginCount" + 1 >= ${input.maxAttempts}
                             THEN ${lockedUntil} ELSE "lockedUntil" END
      WHERE "id" = ${input.userId}
      RETURNING ("failedLoginCount" = 0) AS "locked"
    `
    return { lockedUntil: rows[0]?.locked ? lockedUntil : null }
  }

  async resetFailedLogins(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0 },
    })
  }

  async recordLogin(userId: string, at: Date): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { lastLoginAt: at },
    })
  }
}
