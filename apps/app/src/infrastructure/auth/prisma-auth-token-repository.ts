import type {
  AuthTokenRepository,
  AuthTokenType,
} from "@/core/auth/application/ports/auth-token-repository"
import type { PrismaClient } from "@/generated/prisma/client"

export class PrismaAuthTokenRepository implements AuthTokenRepository {
  constructor(private readonly db: PrismaClient) {}

  async issue(input: {
    userId: string
    type: AuthTokenType
    tokenHash: string
    expiresAt: Date
    now: Date
  }): Promise<void> {
    await this.db.$transaction([
      // Invalidate older links of the same kind: only the newest one works.
      this.db.authToken.updateMany({
        where: { userId: input.userId, type: input.type, consumedAt: null },
        data: { consumedAt: input.now },
      }),
      this.db.authToken.create({
        data: {
          userId: input.userId,
          type: input.type,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          createdAt: input.now,
        },
      }),
    ])
  }

  async consume(
    tokenHash: string,
    type: AuthTokenType,
    now: Date
  ): Promise<{ userId: string } | null> {
    // Conditional update is atomic: of two concurrent requests with the same
    // token, exactly one sees count === 1.
    const { count } = await this.db.authToken.updateMany({
      where: { tokenHash, type, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    })
    if (count !== 1) return null

    return this.db.authToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    })
  }

  async latestIssuedAt(
    userId: string,
    type: AuthTokenType
  ): Promise<Date | null> {
    const latest = await this.db.authToken.findFirst({
      where: { userId, type },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    return latest?.createdAt ?? null
  }
}
