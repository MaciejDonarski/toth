import type { Clock } from "@/core/auth/application/ports/clock"
import type {
  RateLimiter,
  RateLimitResult,
  RateLimitRule,
} from "@/core/auth/application/ports/rate-limiter"
import type { PrismaClient } from "@/generated/prisma/client"

/**
 * Fixed-window rate limiter in Postgres. A single atomic upsert either starts
 * a new window (when the old one elapsed) or increments the counter, so
 * concurrent requests cannot both slip under the limit.
 */
export class PrismaRateLimiter implements RateLimiter {
  constructor(
    private readonly db: PrismaClient,
    private readonly clock: Clock
  ) {}

  async hit({ key, limit, windowMs }: RateLimitRule): Promise<RateLimitResult> {
    const now = this.clock.now()
    const windowFloor = new Date(now.getTime() - windowMs)

    const rows = await this.db.$queryRaw<
      { count: number; windowStart: Date }[]
    >`
      INSERT INTO "RateLimitBucket" ("key", "count", "windowStart")
      VALUES (${key}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."windowStart" <= ${windowFloor}
                       THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimitBucket"."windowStart" <= ${windowFloor}
                       THEN ${now} ELSE "RateLimitBucket"."windowStart" END
      RETURNING "count", "windowStart"
    `
    const row = rows[0]
    if (!row) throw new Error(`Rate limit upsert returned no row for ${key}`)

    return {
      allowed: row.count <= limit,
      remaining: Math.max(0, limit - row.count),
      resetAt: new Date(row.windowStart.getTime() + windowMs),
    }
  }

  async reset(key: string): Promise<void> {
    await this.db.rateLimitBucket.deleteMany({ where: { key } })
  }
}
