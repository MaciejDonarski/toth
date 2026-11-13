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
}
