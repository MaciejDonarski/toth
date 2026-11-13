import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { testDb, truncateAll } from "../../../test/integration/db"
import { PrismaAuthTokenRepository } from "./prisma-auth-token-repository"
import { PrismaRegistrationStore } from "./prisma-registration-store"
import { PrismaUserAccountRepository } from "./prisma-user-account-repository"

const NOW = new Date("2026-11-13T10:00:00Z")
const HOUR = 3_600_000

const store = new PrismaRegistrationStore(testDb)
const users = new PrismaUserAccountRepository(testDb)
const tokens = new PrismaAuthTokenRepository(testDb)

function registration(email: string, tokenHash = `vt-${email}`) {
  return {
    companyName: "Acme",
    name: "Jan Kowalski",
    userLimit: 5,
    email,
    passwordHash: "argon-hash",
    termsVersion: "2026-11-01",
    termsAcceptedAt: NOW,
    verificationTokenHash: tokenHash,
    verificationExpiresAt: new Date(NOW.getTime() + 24 * HOUR),
  }
}

describe("registration persistence (Postgres)", () => {
  beforeEach(truncateAll)
  afterAll(() => testDb.$disconnect())

  it("creates company, unverified ADMIN and verification token together", async () => {
    const result = await store.registerCompanyWithAdmin(
      registration("jan@firma.pl")
    )
    if (result === "EMAIL_TAKEN") throw new Error("unexpected")

    const account = await users.findByEmail("jan@firma.pl")
    expect(account).toMatchObject({
      id: result.userId,
      companyId: result.companyId,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: null,
    })
    const company = await testDb.company.findUniqueOrThrow({
      where: { id: result.companyId },
    })
    expect(company).toMatchObject({ name: "Acme", userLimit: 5 })
    await expect(
      tokens.latestIssuedAt(result.userId, "EMAIL_VERIFICATION")
    ).resolves.toBeInstanceOf(Date)
  })

  it("reports EMAIL_TAKEN and leaves no orphan company", async () => {
    await store.registerCompanyWithAdmin(registration("jan@firma.pl"))
    const second = await store.registerCompanyWithAdmin(
      registration("jan@firma.pl", "other-token")
    )

    expect(second).toBe("EMAIL_TAKEN")
    await expect(testDb.company.count()).resolves.toBe(1)
  })

  it("lets exactly one of two concurrent registrations win", async () => {
    const results = await Promise.all([
      store.registerCompanyWithAdmin(registration("race@firma.pl", "t1")),
      store.registerCompanyWithAdmin(registration("race@firma.pl", "t2")),
    ])
    expect(results.filter((r) => r === "EMAIL_TAKEN")).toHaveLength(1)
    await expect(testDb.company.count()).resolves.toBe(1)
  })

  it("consumes a verification token exactly once, even concurrently", async () => {
    const result = await store.registerCompanyWithAdmin(
      registration("jan@firma.pl", "vt")
    )
    if (result === "EMAIL_TAKEN") throw new Error("unexpected")

    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        tokens.consume("vt", "EMAIL_VERIFICATION", NOW)
      )
    )
    expect(attempts.filter(Boolean)).toEqual([{ userId: result.userId }])
  })

  it("rejects expired tokens and tokens of another type", async () => {
    await store.registerCompanyWithAdmin(registration("jan@firma.pl", "vt"))

    await expect(
      tokens.consume("vt", "PASSWORD_RESET", NOW)
    ).resolves.toBeNull()
    await expect(
      tokens.consume(
        "vt",
        "EMAIL_VERIFICATION",
        new Date(NOW.getTime() + 25 * HOUR)
      )
    ).resolves.toBeNull()
  })

  it("invalidates older tokens when issuing a new one", async () => {
    const result = await store.registerCompanyWithAdmin(
      registration("jan@firma.pl", "old")
    )
    if (result === "EMAIL_TAKEN") throw new Error("unexpected")

    const later = new Date(NOW.getTime() + 60_000)
    await tokens.issue({
      userId: result.userId,
      type: "EMAIL_VERIFICATION",
      tokenHash: "new",
      expiresAt: new Date(later.getTime() + 24 * HOUR),
      now: later,
    })

    await expect(
      tokens.consume("old", "EMAIL_VERIFICATION", later)
    ).resolves.toBeNull()
    await expect(
      tokens.consume("new", "EMAIL_VERIFICATION", later)
    ).resolves.toEqual({
      userId: result.userId,
    })
    await expect(
      tokens.latestIssuedAt(result.userId, "EMAIL_VERIFICATION")
    ).resolves.toEqual(later)
  })

  it("marks the email verified once and keeps the first timestamp", async () => {
    const result = await store.registerCompanyWithAdmin(
      registration("jan@firma.pl")
    )
    if (result === "EMAIL_TAKEN") throw new Error("unexpected")

    await users.markEmailVerified(result.userId, NOW)
    await users.markEmailVerified(result.userId, new Date(NOW.getTime() + HOUR))

    await expect(users.findById(result.userId)).resolves.toMatchObject({
      emailVerifiedAt: NOW,
    })
  })
})
