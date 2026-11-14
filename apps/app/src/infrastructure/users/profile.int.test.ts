import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/auth/domain/tenant-context"

import { testDb, truncateAll } from "../../../test/integration/db"
import {
  PrismaPasswordChangeStore,
  PrismaProfileRepository,
} from "./prisma-profile-repository"

const NOW = new Date("2026-11-13T10:00:00Z")
const DAY = 24 * 3_600_000
const at = (ms: number) => new Date(NOW.getTime() + ms)

const profiles = new PrismaProfileRepository()
const passwords = new PrismaPasswordChangeStore()

async function seed(companyName: string, email: string) {
  const company = await testDb.company.create({
    data: {
      name: companyName,
      users: {
        create: {
          email,
          name: "Old Name",
          passwordHash: "old",
          color: "blue",
          role: "WORKER",
          emailVerifiedAt: NOW,
          workingHours: {
            create: { weekday: 1, startMinute: 600, endMinute: 900 },
          },
        },
      },
    },
    select: { id: true, users: { select: { id: true } } },
  })
  const userId = company.users[0]!.id
  const ctx: TenantContext = { userId, companyId: company.id, role: "WORKER" }
  return { ctx, userId, companyId: company.id }
}

describe("own profile (Postgres)", () => {
  beforeEach(truncateAll)
  afterAll(() => testDb.$disconnect())

  it("replaces name, phone and the whole week of the caller", async () => {
    const { ctx } = await seed("A", "jan@a.pl")
    const saved = await profiles.updateOwn(ctx, {
      name: "Jan Kowalski",
      phone: "+48600100200",
      color: "rose",
      schedule: { 2: { start: 480, end: 960 }, 5: { start: 480, end: 840 } },
    })
    expect(saved).toBe(true)
    await expect(profiles.getOwn(ctx)).resolves.toEqual({
      name: "Jan Kowalski",
      email: "jan@a.pl",
      phone: "+48600100200",
      color: "rose",
      role: "WORKER",
      // Monday (from the seed) became a day off.
      schedule: { 2: { start: 480, end: 960 }, 5: { start: 480, end: 840 } },
    })
  })

  it("never touches another user, even with a forged context", async () => {
    const a = await seed("A", "jan@a.pl")
    const b = await seed("B", "ewa@b.pl")

    // User id of B, company of A: matches nobody.
    const forged: TenantContext = { ...a.ctx, userId: b.userId }
    await expect(
      profiles.updateOwn(forged, {
        name: "Hacked",
        phone: null,
        color: "red",
        schedule: {},
      })
    ).resolves.toBe(false)
    await expect(profiles.getOwn(forged)).resolves.toBeNull()

    await expect(profiles.getOwn(b.ctx)).resolves.toMatchObject({
      name: "Old Name",
      schedule: { 1: { start: 600, end: 900 } },
    })
  })

  it("enforces the working-hours rules in the database too", async () => {
    const { userId } = await seed("A", "jan@a.pl")
    const insert = (weekday: number, startMinute: number, endMinute: number) =>
      testDb.workingHours.create({
        data: { userId, weekday, startMinute, endMinute },
      })
    await expect(insert(2, 960, 480)).rejects.toThrow() // overnight
    await expect(insert(8, 480, 960)).rejects.toThrow() // no such weekday
    await expect(insert(3, 0, 1441)).rejects.toThrow() // past midnight
    await expect(insert(4, 0, 1440)).resolves.toBeDefined()
  })
})

describe("password change (Postgres)", () => {
  beforeEach(truncateAll)
  afterAll(() => testDb.$disconnect())

  it("keeps the current session, revokes the rest, only for the caller", async () => {
    const a = await seed("A", "jan@a.pl")
    const b = await seed("B", "ewa@b.pl")
    for (const [id, userId, companyId] of [
      ["current", a.userId, a.companyId],
      ["other", a.userId, a.companyId],
      ["b-session", b.userId, b.companyId],
    ] as const) {
      await testDb.session.create({
        data: {
          id,
          userId,
          companyId,
          absoluteExpiresAt: at(DAY),
          createdAt: at(-DAY),
          authenticatedAt: at(-DAY),
        },
      })
    }
    await testDb.trustedDevice.createMany({
      data: [
        { userId: a.userId, tokenHash: "td-a", expiresAt: at(30 * DAY) },
        { userId: b.userId, tokenHash: "td-b", expiresAt: at(30 * DAY) },
      ],
    })

    await expect(
      passwords.change(a.ctx, {
        currentSessionHash: "current",
        passwordHash: "new",
        now: NOW,
      })
    ).resolves.toBe(true)

    const sessions = await testDb.session.findMany({ orderBy: { id: "asc" } })
    expect(sessions.map((s) => [s.id, s.revokedAt, s.authenticatedAt])).toEqual(
      [
        ["b-session", null, at(-DAY)],
        ["current", null, NOW],
        ["other", NOW, at(-DAY)],
      ]
    )
    await expect(
      testDb.trustedDevice.findMany({
        select: { tokenHash: true, revokedAt: true },
        orderBy: { tokenHash: "asc" },
      })
    ).resolves.toEqual([
      { tokenHash: "td-a", revokedAt: NOW },
      { tokenHash: "td-b", revokedAt: null },
    ])
    await expect(
      testDb.user.findUniqueOrThrow({ where: { id: a.userId } })
    ).resolves.toMatchObject({ passwordHash: "new", passwordChangedAt: NOW })
    await expect(
      testDb.user.findUniqueOrThrow({ where: { id: b.userId } })
    ).resolves.toMatchObject({ passwordHash: "old" })
  })

  it("cannot re-authenticate a session of another user", async () => {
    const a = await seed("A", "jan@a.pl")
    const b = await seed("B", "ewa@b.pl")
    await testDb.session.create({
      data: {
        id: "b-session",
        userId: b.userId,
        companyId: b.companyId,
        absoluteExpiresAt: at(DAY),
        authenticatedAt: at(-DAY),
      },
    })
    await passwords.change(a.ctx, {
      currentSessionHash: "b-session",
      passwordHash: "new",
      now: NOW,
    })

    await expect(
      testDb.session.findUniqueOrThrow({ where: { id: "b-session" } })
    ).resolves.toMatchObject({ authenticatedAt: at(-DAY), revokedAt: null })
  })
})
