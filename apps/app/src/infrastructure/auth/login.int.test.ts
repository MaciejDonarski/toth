import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { testDb, truncateAll } from "../../../test/integration/db"
import { PrismaLoginChallengeRepository } from "./prisma-login-challenge-repository"
import { PrismaSessionRepository } from "./prisma-session-repository"
import { PrismaTrustedDeviceRepository } from "./prisma-trusted-device-repository"
import { PrismaUserAccountRepository } from "./prisma-user-account-repository"

const NOW = new Date("2026-11-13T10:00:00Z")
const MINUTE = 60_000
const at = (ms: number) => new Date(NOW.getTime() + ms)

const challenges = new PrismaLoginChallengeRepository(testDb)
const devices = new PrismaTrustedDeviceRepository(testDb)
const sessions = new PrismaSessionRepository(testDb)
const users = new PrismaUserAccountRepository(testDb)

async function seedUser(passwordChangedAt = at(-60 * MINUTE)) {
  const company = await testDb.company.create({
    data: {
      name: "Acme",
      users: {
        create: {
          email: "jan@firma.pl",
          passwordHash: "x",
          color: "blue",
          role: "ADMIN",
          emailVerifiedAt: NOW,
          passwordChangedAt,
        },
      },
    },
    select: { id: true, users: { select: { id: true } } },
  })
  return { companyId: company.id, userId: company.users[0]!.id }
}

async function openChallenge(userId: string, id = "c1") {
  await challenges.create({
    id,
    userId,
    codeHash: "code",
    codeExpiresAt: at(3 * MINUTE),
    expiresAt: at(15 * MINUTE),
    now: NOW,
  })
}

describe("login persistence (Postgres)", () => {
  beforeEach(truncateAll)
  afterAll(() => testDb.$disconnect())

  it("never lets parallel code attempts exceed the limit", async () => {
    const { userId } = await seedUser()
    await openChallenge(userId)

    const results = await Promise.all(
      Array.from({ length: 12 }, () => challenges.registerAttempt("c1", NOW, 5))
    )
    expect(results.filter(Boolean)).toHaveLength(5)
    await expect(challenges.findById("c1")).resolves.toMatchObject({
      attempts: 5,
    })
  })

  it("verifies once and redeems the grant exactly once, within 60 s", async () => {
    const { userId } = await seedUser()
    await openChallenge(userId)

    const verified = await Promise.all([
      challenges.markVerified("c1", "g1", NOW),
      challenges.markVerified("c1", "g2", NOW),
    ])
    expect(verified.filter(Boolean)).toHaveLength(1)
    const grant = verified[0] ? "g1" : "g2"

    await expect(
      challenges.consumeGrant(grant, at(61_000), at(1_000))
    ).resolves.toBeNull() // stale
    const redeemed = await Promise.all([
      challenges.consumeGrant(grant, at(5_000), at(-55_000)),
      challenges.consumeGrant(grant, at(5_000), at(-55_000)),
    ])
    expect(redeemed.filter(Boolean)).toEqual([
      { challengeId: "c1", userId, viaTrustedDevice: false },
    ])
  })

  it("caps resends atomically", async () => {
    const { userId } = await seedUser()
    await openChallenge(userId)

    const replaced = await Promise.all([
      challenges.replaceCode({
        id: "c1",
        codeHash: "a",
        codeExpiresAt: at(4 * MINUTE),
        now: at(MINUTE),
        expectedResendCount: 0,
      }),
      challenges.replaceCode({
        id: "c1",
        codeHash: "b",
        codeExpiresAt: at(4 * MINUTE),
        now: at(MINUTE),
        expectedResendCount: 0,
      }),
    ])
    expect(replaced.filter(Boolean)).toHaveLength(1)
    await expect(challenges.findById("c1")).resolves.toMatchObject({
      resendCount: 1,
      lastSentAt: at(MINUTE),
    })
  })

  it("locks the account on the 5th failure, even under concurrency", async () => {
    const { userId } = await seedUser()
    const fail = () =>
      users.recordFailedLogin({
        userId,
        now: NOW,
        maxAttempts: 5,
        lockoutMs: 15 * MINUTE,
      })

    const results = await Promise.all(Array.from({ length: 5 }, fail))
    expect(results.filter((r) => r.lockedUntil)).toEqual([
      { lockedUntil: at(15 * MINUTE) },
    ])
    await expect(users.findById(userId)).resolves.toMatchObject({
      failedLoginCount: 0,
      lockedUntil: at(15 * MINUTE),
    })
  })

  it("only honours trusted devices created after the last password change", async () => {
    const { userId } = await seedUser(at(-60 * MINUTE))
    await devices.create({
      userId,
      tokenHash: "old",
      expiresAt: at(30 * 24 * 60 * MINUTE),
      now: at(-120 * MINUTE),
    })
    await devices.create({
      userId,
      tokenHash: "new",
      expiresAt: at(30 * 24 * 60 * MINUTE),
      now: at(-30 * MINUTE),
    })
    await devices.create({
      userId,
      tokenHash: "expired",
      expiresAt: at(-1),
      now: at(-30 * MINUTE),
    })

    const find = (tokenHash: string, user = userId) =>
      devices.findValid({
        tokenHash,
        userId: user,
        now: NOW,
        trustedSince: at(-60 * MINUTE),
      })

    await expect(find("old")).resolves.toBeNull()
    await expect(find("expired")).resolves.toBeNull()
    await expect(find("new", "someone-else")).resolves.toBeNull()
    await expect(find("new")).resolves.toEqual({ id: expect.any(String) })
  })

  it("stores sessions with their owner's current state and revokes them", async () => {
    const { userId, companyId } = await seedUser()
    await sessions.create({
      id: "s1",
      userId,
      companyId,
      absoluteExpiresAt: at(7 * 24 * 60 * MINUTE),
      viaTrustedDevice: false,
      now: NOW,
    })

    await expect(sessions.findById("s1")).resolves.toMatchObject({
      revokedAt: null,
      user: { id: userId, companyId, role: "ADMIN", status: "ACTIVE" },
    })
    await sessions.touch("s1", at(MINUTE))
    await sessions.revoke("s1", at(2 * MINUTE))
    await sessions.touch("s1", at(3 * MINUTE)) // no effect once revoked

    await expect(sessions.findById("s1")).resolves.toMatchObject({
      lastSeenAt: at(MINUTE),
      revokedAt: at(2 * MINUTE),
    })
  })
})
