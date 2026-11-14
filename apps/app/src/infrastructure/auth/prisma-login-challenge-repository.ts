import type {
  LoginChallenge,
  LoginChallengeRepository,
  NewLoginChallenge,
  RedeemedGrant,
} from "@/core/auth/application/ports/login-challenge-repository"
import type { PrismaClient } from "@/generated/prisma/client"

const SELECT = {
  id: true,
  userId: true,
  codeHash: true,
  codeExpiresAt: true,
  expiresAt: true,
  attempts: true,
  resendCount: true,
  lastSentAt: true,
  verifiedAt: true,
  consumedAt: true,
  viaTrustedDevice: true,
} as const

export class PrismaLoginChallengeRepository implements LoginChallengeRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(c: NewLoginChallenge): Promise<void> {
    await this.db.loginChallenge.create({
      data: {
        id: c.id,
        userId: c.userId,
        codeHash: c.codeHash,
        codeExpiresAt: c.codeExpiresAt,
        expiresAt: c.expiresAt,
        lastSentAt: c.now,
        createdAt: c.now,
        ip: c.ip,
        userAgent: c.userAgent,
        viaTrustedDevice: !!c.verified,
        verifiedAt: c.verified ? c.now : null,
        grantHash: c.verified?.grantHash,
      },
    })
  }

  findById(id: string): Promise<LoginChallenge | null> {
    return this.db.loginChallenge.findUnique({ where: { id }, select: SELECT })
  }

  async registerAttempt(
    id: string,
    now: Date,
    maxAttempts: number
  ): Promise<LoginChallenge | null> {
    const { count } = await this.db.loginChallenge.updateMany({
      where: {
        id,
        verifiedAt: null,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: maxAttempts },
      },
      data: { attempts: { increment: 1 } },
    })
    return count === 1 ? this.findById(id) : null
  }

  async markVerified(
    id: string,
    grantHash: string,
    now: Date
  ): Promise<boolean> {
    const { count } = await this.db.loginChallenge.updateMany({
      where: { id, verifiedAt: null, consumedAt: null, expiresAt: { gt: now } },
      data: { verifiedAt: now, grantHash },
    })
    return count === 1
  }

  async replaceCode(input: {
    id: string
    codeHash: string
    codeExpiresAt: Date
    now: Date
    expectedResendCount: number
  }): Promise<boolean> {
    const { count } = await this.db.loginChallenge.updateMany({
      where: {
        id: input.id,
        verifiedAt: null,
        consumedAt: null,
        resendCount: input.expectedResendCount,
      },
      data: {
        codeHash: input.codeHash,
        codeExpiresAt: input.codeExpiresAt,
        lastSentAt: input.now,
        resendCount: { increment: 1 },
      },
    })
    return count === 1
  }

  async consumeGrant(
    grantHash: string,
    now: Date,
    verifiedAfter: Date
  ): Promise<RedeemedGrant | null> {
    const { count } = await this.db.loginChallenge.updateMany({
      where: {
        grantHash,
        consumedAt: null,
        verifiedAt: { gte: verifiedAfter },
      },
      data: { consumedAt: now },
    })
    if (count !== 1) return null

    const challenge = await this.db.loginChallenge.findUnique({
      where: { grantHash },
      select: { id: true, userId: true, viaTrustedDevice: true },
    })
    return challenge
      ? {
          challengeId: challenge.id,
          userId: challenge.userId,
          viaTrustedDevice: challenge.viaTrustedDevice,
        }
      : null
  }
}
