import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { testDb, truncateAll } from "../../../test/integration/db"
import { PrismaAuthTokenRepository } from "./prisma-auth-token-repository"
import { PrismaPasswordResetStore } from "./prisma-password-reset-store"

const NOW = new Date("2026-11-13T10:00:00Z")
const MINUTE = 60_000
const at = (ms: number) => new Date(NOW.getTime() + ms)

const store = new PrismaPasswordResetStore(testDb)
const tokens = new PrismaAuthTokenRepository(testDb)

/** A user with live sessions, a trusted device, an open challenge and a lock. */
async function seed(email = "jan@firma.pl") {
  const company = await testDb.company.create({
    data: {
      name: "Acme",
      users: {
        create: {
          email,
          passwordHash: "old-hash",
          color: "blue",
          role: "ADMIN",
          emailVerifiedAt: null,
          failedLoginCount: 3,
          lockedUntil: at(10 * MINUTE),
          passwordChangedAt: at(-24 * 60 * MINUTE),
        },
      },
    },
    select: { id: true, users: { select: { id: true } } },
  })
  const userId = company.users[0]!.id
  for (const id of [`${email}-s1`, `${email}-s2`]) {
    await testDb.session.create({
      data: {
        id,
        userId,
        companyId: company.id,
        absoluteExpiresAt: at(7 * 24 * 60 * MINUTE),
      },
    })
  }
  await testDb.trustedDevice.create({
    data: {
      userId,
      tokenHash: `${email}-td`,
      expiresAt: at(30 * 24 * 60 * MINUTE),
    },
  })
  await testDb.loginChallenge.create({
    data: {
      id: `${email}-lc`,
      userId,
      codeHash: "c",
      codeExpiresAt: at(3 * MINUTE),
      expiresAt: at(15 * MINUTE),
      lastSentAt: NOW,
    },
  })
  await tokens.issue({
    userId,
    type: "PASSWORD_RESET",
    tokenHash: `${email}-reset`,
    expiresAt: at(30 * MINUTE),
    now: NOW,
  })
  return { userId, companyId: company.id }
}

describe("PrismaPasswordResetStore (Postgres)", () => {
  beforeEach(truncateAll)
  afterAll(() => testDb.$disconnect())

  it("changes the password and revokes every way back in, atomically", async () => {
    const { userId, companyId } = await seed()
    const result = await store.resetWithToken({
      tokenHash: "jan@firma.pl-reset",
      passwordHash: "new-hash",
      now: at(MINUTE),
    })
    expect(result).toEqual({ userId, companyId, email: "jan@firma.pl" })

    await expect(
      testDb.user.findUniqueOrThrow({ where: { id: userId } })
    ).resolves.toMatchObject({
      passwordHash: "new-hash",
      passwordChangedAt: at(MINUTE),
      failedLoginCount: 0,
      lockedUntil: null,
      emailVerifiedAt: at(MINUTE),
    })
    await expect(
      testDb.session.count({ where: { userId, revokedAt: null } })
    ).resolves.toBe(0)
    await expect(
      testDb.trustedDevice.count({ where: { userId, revokedAt: null } })
    ).resolves.toBe(0)
    await expect(
      testDb.loginChallenge.count({ where: { userId, consumedAt: null } })
    ).resolves.toBe(0)
  })

  it("works only once, even for parallel submits", async () => {
    await seed()
    const results = await Promise.all(
      ["a", "b", "c"].map((h) =>
        store.resetWithToken({
          tokenHash: "jan@firma.pl-reset",
          passwordHash: h,
          now: at(MINUTE),
        })
      )
    )
    expect(results.filter(Boolean)).toHaveLength(1)
  })

  it("changes nothing for an expired link", async () => {
    const { userId } = await seed()
    await expect(
      store.resetWithToken({
        tokenHash: "jan@firma.pl-reset",
        passwordHash: "new",
        now: at(30 * MINUTE),
      })
    ).resolves.toBeNull()

    await expect(
      testDb.user.findUniqueOrThrow({ where: { id: userId } })
    ).resolves.toMatchObject({
      passwordHash: "old-hash",
    })
    await expect(
      testDb.session.count({ where: { userId, revokedAt: null } })
    ).resolves.toBe(2)
  })

  it("only touches the token owner", async () => {
    await seed("jan@firma.pl")
    const other = await seed("ewa@inna.pl")
    await store.resetWithToken({
      tokenHash: "jan@firma.pl-reset",
      passwordHash: "new",
      now: at(MINUTE),
    })

    await expect(
      testDb.session.count({ where: { userId: other.userId, revokedAt: null } })
    ).resolves.toBe(2)
    await expect(
      testDb.user.findUniqueOrThrow({ where: { id: other.userId } })
    ).resolves.toMatchObject({ passwordHash: "old-hash" })
  })

  it("checks link validity without consuming it", async () => {
    await seed()
    await expect(
      tokens.isActive("jan@firma.pl-reset", "PASSWORD_RESET", NOW)
    ).resolves.toBe(true)
    await expect(
      tokens.isActive("jan@firma.pl-reset", "PASSWORD_RESET", NOW)
    ).resolves.toBe(true)
    await expect(
      tokens.isActive("jan@firma.pl-reset", "EMAIL_VERIFICATION", NOW)
    ).resolves.toBe(false)
  })
})
