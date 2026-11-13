import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { Clock } from "@/core/auth/application/ports/clock"

import { testDb, truncateAll } from "../../../test/integration/db"
import { PrismaRateLimiter } from "./prisma-rate-limiter"

class FakeClock implements Clock {
  constructor(public current = new Date("2026-11-13T10:00:00Z")) {}
  now() {
    return this.current
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms)
  }
}

const rule = { key: "login:ip:1.2.3.4", limit: 3, windowMs: 60_000 }

describe("PrismaRateLimiter (Postgres)", () => {
  let clock: FakeClock
  let limiter: PrismaRateLimiter

  beforeEach(async () => {
    await truncateAll()
    clock = new FakeClock()
    limiter = new PrismaRateLimiter(testDb, clock)
  })

  afterAll(async () => {
    await testDb.$disconnect()
  })

  it("allows up to the limit within a window, then blocks", async () => {
    const results = []
    for (let i = 0; i < 4; i++) results.push(await limiter.hit(rule))

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0])
    expect(results[3]?.resetAt).toEqual(new Date("2026-11-13T10:01:00Z"))
  })

  it("starts a new window once the old one has elapsed", async () => {
    for (let i = 0; i < 4; i++) await limiter.hit(rule)
    clock.advance(60_000)

    await expect(limiter.hit(rule)).resolves.toMatchObject({
      allowed: true,
      remaining: 2,
    })
  })

  it("keeps buckets independent and resettable", async () => {
    for (let i = 0; i < 4; i++) await limiter.hit(rule)
    await expect(
      limiter.hit({ ...rule, key: "login:ip:5.6.7.8" })
    ).resolves.toMatchObject({ allowed: true })

    await limiter.reset(rule.key)
    await expect(limiter.hit(rule)).resolves.toMatchObject({ allowed: true })
  })

  it("counts concurrent hits atomically", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => limiter.hit(rule))
    )
    expect(results.filter((r) => r.allowed)).toHaveLength(3)
  })
})
