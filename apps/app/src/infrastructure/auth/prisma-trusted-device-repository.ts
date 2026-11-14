import type { TrustedDeviceRepository } from "@/core/auth/application/ports/trusted-device-repository"
import type { PrismaClient } from "@/generated/prisma/client"

export class PrismaTrustedDeviceRepository implements TrustedDeviceRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    userId: string
    tokenHash: string
    userAgent?: string
    expiresAt: Date
    now: Date
  }): Promise<void> {
    await this.db.trustedDevice.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
        createdAt: input.now,
      },
    })
  }

  findValid(input: {
    tokenHash: string
    userId: string
    now: Date
    trustedSince: Date
  }): Promise<{ id: string } | null> {
    return this.db.trustedDevice.findFirst({
      where: {
        tokenHash: input.tokenHash,
        userId: input.userId,
        revokedAt: null,
        expiresAt: { gt: input.now },
        createdAt: { gte: input.trustedSince },
      },
      select: { id: true },
    })
  }

  async touch(id: string, now: Date): Promise<void> {
    await this.db.trustedDevice.update({
      where: { id },
      data: { lastUsedAt: now },
    })
  }
}
