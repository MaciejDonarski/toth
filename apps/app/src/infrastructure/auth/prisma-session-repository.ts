import type {
  SessionRepository,
  StoredSession,
} from "@/core/auth/application/ports/session-repository"
import type { PrismaClient } from "@/generated/prisma/client"

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    id: string
    userId: string
    companyId: string
    absoluteExpiresAt: Date
    viaTrustedDevice: boolean
    now: Date
    ip?: string
    userAgent?: string
  }): Promise<void> {
    await this.db.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        companyId: input.companyId,
        absoluteExpiresAt: input.absoluteExpiresAt,
        viaTrustedDevice: input.viaTrustedDevice,
        createdAt: input.now,
        authenticatedAt: input.now,
        lastSeenAt: input.now,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    })
  }

  findById(id: string): Promise<StoredSession | null> {
    return this.db.session.findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        authenticatedAt: true,
        lastSeenAt: true,
        absoluteExpiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            companyId: true,
            email: true,
            name: true,
            color: true,
            role: true,
            status: true,
            passwordChangedAt: true,
          },
        },
      },
    })
  }

  async touch(id: string, now: Date): Promise<void> {
    await this.db.session.updateMany({
      where: { id, revokedAt: null },
      data: { lastSeenAt: now },
    })
  }

  async revoke(id: string, now: Date): Promise<void> {
    await this.db.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: now },
    })
  }
}
