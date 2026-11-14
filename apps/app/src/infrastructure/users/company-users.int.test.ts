import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

import { testDb, truncateAll } from "../../../test/integration/db"
import { PrismaCompanyUsersRepository } from "./prisma-company-users-repository"
import { PrismaInvitationAcceptanceStore } from "./prisma-invitation-acceptance-store"

const NOW = new Date("2026-11-13T10:00:00Z")
const DAY = 24 * 3_600_000
const at = (ms: number) => new Date(NOW.getTime() + ms)

const repo = new PrismaCompanyUsersRepository()
const ALL = { page: 1, pageSize: 100, filters: {} }
const acceptances = new PrismaInvitationAcceptanceStore(testDb)

async function seedCompany(
  name: string,
  users: { email: string; role: Role }[],
  userLimit = 5
) {
  const company = await testDb.company.create({
    data: { name, userLimit },
    select: { id: true },
  })
  const ids: string[] = []
  for (const u of users) {
    const user = await testDb.user.create({
      data: {
        ...u,
        companyId: company.id,
        passwordHash: "x",
        color: "blue",
        emailVerifiedAt: NOW,
      },
      select: { id: true },
    })
    ids.push(user.id)
  }
  const ctx: TenantContext = {
    userId: ids[0]!,
    companyId: company.id,
    role: "ADMIN",
  }
  return { companyId: company.id, userIds: ids, ctx }
}

function invite(
  ctx: TenantContext,
  email: string,
  tokenHash = `t-${email}`,
  role: Role = "WORKER"
) {
  return repo.createInvitation(ctx, {
    email,
    role,
    tokenHash,
    expiresAt: at(3 * DAY),
    now: NOW,
  })
}

describe("company users (Postgres)", () => {
  beforeEach(truncateAll)
  afterAll(() => testDb.$disconnect())

  describe("tenant isolation A/B", () => {
    async function twoCompanies() {
      const a = await seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
        { email: "worker@a.pl", role: "WORKER" },
      ])
      const b = await seedCompany("B", [
        { email: "admin@b.pl", role: "ADMIN" },
        { email: "worker@b.pl", role: "WORKER" },
      ])
      await invite(a.ctx, "new@a.pl")
      await invite(b.ctx, "new@b.pl")
      return { a, b }
    }

    it("lists only the caller's members and invitations", async () => {
      const { a } = await twoCompanies()
      const members = (await repo.listMembers(a.ctx, ALL)).items
      const invitations = (await repo.listPendingInvitations(a.ctx, NOW, ALL))
        .items

      expect(members.map((m) => m.email).sort()).toEqual([
        "admin@a.pl",
        "worker@a.pl",
      ])
      expect(invitations.map((i) => i.email)).toEqual(["new@a.pl"])
      await expect(repo.seatUsage(a.ctx, NOW)).resolves.toEqual({
        used: 3,
        limit: 5,
      })
    })

    it("cannot change roles or status of another company's users", async () => {
      const { a, b } = await twoCompanies()
      const victim = b.userIds[1]!

      await expect(repo.changeRole(a.ctx, victim, "ADMIN")).resolves.toBe(
        "NOT_FOUND"
      )
      await expect(repo.setActive(a.ctx, victim, false, NOW)).resolves.toBe(
        "NOT_FOUND"
      )
      await expect(repo.anonymize(a.ctx, victim, NOW)).resolves.toBe(
        "NOT_FOUND"
      )
      await expect(
        testDb.user.findUniqueOrThrow({ where: { id: victim } })
      ).resolves.toMatchObject({
        role: "WORKER",
        status: "ACTIVE",
        email: "worker@b.pl",
      })
    })

    it("cannot revoke another company's invitation", async () => {
      const { a, b } = await twoCompanies()
      const foreign = await testDb.invitation.findFirstOrThrow({
        where: { companyId: b.companyId },
      })
      await expect(repo.revokeInvitation(a.ctx, foreign.id, NOW)).resolves.toBe(
        false
      )
      await expect(
        testDb.invitation.findUniqueOrThrow({ where: { id: foreign.id } })
      ).resolves.toMatchObject({ revokedAt: null })
    })

    it("counts seats per company only", async () => {
      const { a, b } = await twoCompanies()
      await testDb.company.update({
        where: { id: b.companyId },
        data: { userLimit: 3 },
      })
      await expect(invite(b.ctx, "another@b.pl")).resolves.toEqual({
        ok: false,
        error: "USER_LIMIT_REACHED",
      })
      await expect(invite(a.ctx, "another@a.pl")).resolves.toMatchObject({
        ok: true,
      })
    })

    it("accepting an invitation joins the invitation's company, nothing else", async () => {
      const { a, b } = await twoCompanies()
      const result = await acceptances.accept({
        tokenHash: "t-new@a.pl",
        name: "Nowy",
        passwordHash: "h",
        termsVersion: "v",
        now: NOW,
      })
      expect(result).toMatchObject({ ok: true, companyId: a.companyId })
      await expect(repo.listMembers(b.ctx, ALL)).resolves.toMatchObject({
        total: 2,
      })
    })
  })

  describe("seat limit", () => {
    it("never exceeds the limit under concurrent invitations", async () => {
      const { ctx } = await seedCompany(
        "A",
        [{ email: "admin@a.pl", role: "ADMIN" }],
        3
      )
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) => invite(ctx, `u${i}@a.pl`))
      )
      expect(results.filter((r) => r.ok)).toHaveLength(2)
      await expect(repo.seatUsage(ctx, NOW)).resolves.toEqual({
        used: 3,
        limit: 3,
      })
    })

    it("frees seats for revoked and expired invitations and disabled users", async () => {
      const { ctx, userIds } = await seedCompany(
        "A",
        [
          { email: "admin@a.pl", role: "ADMIN" },
          { email: "w@a.pl", role: "WORKER" },
        ],
        3
      )
      await invite(ctx, "x@a.pl")
      await expect(invite(ctx, "y@a.pl")).resolves.toMatchObject({ ok: false })

      const x = await testDb.invitation.findFirstOrThrow({
        where: { email: "x@a.pl" },
      })
      await repo.revokeInvitation(ctx, x.id, NOW)
      await expect(invite(ctx, "y@a.pl")).resolves.toMatchObject({ ok: true })

      await repo.setActive(ctx, userIds[1]!, false, NOW)
      await expect(
        repo.listPendingInvitations(ctx, at(4 * DAY), ALL)
      ).resolves.toEqual({ items: [], total: 0 }) // y expired by then
      await expect(repo.seatUsage(ctx, NOW)).resolves.toEqual({
        used: 2,
        limit: 3,
      })
    })

    it("re-inviting replaces the old invitation without taking a second seat", async () => {
      const { ctx } = await seedCompany(
        "A",
        [{ email: "admin@a.pl", role: "ADMIN" }],
        2
      )
      await invite(ctx, "x@a.pl", "old")
      await expect(
        invite(ctx, "x@a.pl", "new", "MANAGER")
      ).resolves.toMatchObject({ ok: true })

      await expect(acceptances.findOpen("old", NOW)).resolves.toBeNull()
      await expect(acceptances.findOpen("new", NOW)).resolves.toMatchObject({
        role: "MANAGER",
      })
    })

    it("refuses only emails of the inviting company's own users", async () => {
      const { ctx } = await seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
      ])
      await expect(invite(ctx, "admin@a.pl")).resolves.toEqual({
        ok: false,
        error: "EMAIL_TAKEN",
      })
    })

    it("treats an email of another company like a new one (no enumeration)", async () => {
      const { ctx } = await seedCompany(
        "A",
        [{ email: "admin@a.pl", role: "ADMIN" }],
        3
      )
      await seedCompany("B", [{ email: "taken@b.pl", role: "ADMIN" }])

      await expect(invite(ctx, "taken@b.pl")).resolves.toEqual({
        ok: true,
        companyName: "A",
        existingAccount: true,
      })
      await expect(invite(ctx, "free@a.pl")).resolves.toEqual({
        ok: true,
        companyName: "A",
        existingAccount: false,
      })
      // Same footprint for the inviter: listed and holding a seat.
      await expect(
        repo.listPendingInvitations(ctx, NOW, ALL)
      ).resolves.toMatchObject({ total: 2 })
      await expect(repo.seatUsage(ctx, NOW)).resolves.toEqual({
        used: 3,
        limit: 3,
      })
      // With the seats full both answers are the same, too.
      for (const email of ["admin@b.pl", "nobody@x.pl"]) {
        await expect(invite(ctx, email)).resolves.toEqual({
          ok: false,
          error: "USER_LIMIT_REACHED",
        })
      }
    })

    it("needs a free seat to re-enable a user", async () => {
      const { ctx, userIds } = await seedCompany(
        "A",
        [
          { email: "admin@a.pl", role: "ADMIN" },
          { email: "w@a.pl", role: "WORKER" },
        ],
        2
      )
      await repo.setActive(ctx, userIds[1]!, false, NOW)
      await invite(ctx, "x@a.pl")
      await expect(repo.setActive(ctx, userIds[1]!, true, NOW)).resolves.toBe(
        "USER_LIMIT_REACHED"
      )
    })
  })

  describe("admin guards", () => {
    it("never changes, disables or deletes an admin", async () => {
      const { ctx, userIds } = await seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
        { email: "admin2@a.pl", role: "ADMIN" },
      ])
      const admin2 = userIds[1]!
      await expect(repo.changeRole(ctx, admin2, "WORKER")).resolves.toBe(
        "ADMIN_PROTECTED"
      )
      await expect(repo.setActive(ctx, admin2, false, NOW)).resolves.toBe(
        "ADMIN_PROTECTED"
      )
      await expect(repo.anonymize(ctx, admin2, NOW)).resolves.toBe(
        "ADMIN_PROTECTED"
      )
      await expect(
        testDb.user.findUniqueOrThrow({ where: { id: admin2 } })
      ).resolves.toMatchObject({ role: "ADMIN", status: "ACTIVE" })
    })

    it("may still promote a member to admin", async () => {
      const { ctx, userIds } = await seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
        { email: "w@a.pl", role: "WORKER" },
      ])
      await expect(
        repo.changeRole(ctx, userIds[1]!, "ADMIN")
      ).resolves.toBeNull()
    })

    it("disabling signs the user out everywhere", async () => {
      const { ctx, companyId, userIds } = await seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
        { email: "w@a.pl", role: "WORKER" },
      ])
      const userId = userIds[1]!
      await testDb.session.create({
        data: { id: "s", userId, companyId, absoluteExpiresAt: at(DAY) },
      })
      await testDb.trustedDevice.create({
        data: { userId, tokenHash: "td", expiresAt: at(30 * DAY) },
      })
      await testDb.loginChallenge.create({
        data: {
          id: "lc",
          userId,
          codeHash: "c",
          codeExpiresAt: at(DAY),
          expiresAt: at(DAY),
          lastSentAt: NOW,
        },
      })
      await testDb.authToken.create({
        data: {
          userId,
          type: "PASSWORD_RESET",
          tokenHash: "reset",
          expiresAt: at(DAY),
        },
      })

      await expect(repo.setActive(ctx, userId, false, NOW)).resolves.toBeNull()
      await expect(
        testDb.loginChallenge.findUniqueOrThrow({ where: { id: "lc" } })
      ).resolves.toMatchObject({ consumedAt: NOW })
      await expect(
        testDb.authToken.findUniqueOrThrow({ where: { tokenHash: "reset" } })
      ).resolves.toMatchObject({ consumedAt: NOW })
      await expect(
        testDb.session.findUniqueOrThrow({ where: { id: "s" } })
      ).resolves.toMatchObject({
        revokedAt: NOW,
      })
      await expect(
        testDb.trustedDevice.findUniqueOrThrow({ where: { tokenHash: "td" } })
      ).resolves.toMatchObject({ revokedAt: NOW })
    })
  })

  describe("accepting invitations", () => {
    it("creates a verified user with the invited role, once", async () => {
      const { ctx, companyId } = await seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
      ])
      await invite(ctx, "new@a.pl", "tok", "MANAGER")

      const attempt = () =>
        acceptances.accept({
          tokenHash: "tok",
          name: "Nowy",
          passwordHash: "h",
          termsVersion: "v",
          now: NOW,
        })
      const results = await Promise.all([attempt(), attempt(), attempt()])

      expect(results.filter((r) => r.ok)).toHaveLength(1)
      await expect(
        testDb.user.findUniqueOrThrow({ where: { email: "new@a.pl" } })
      ).resolves.toMatchObject({
        companyId,
        role: "MANAGER",
        name: "Nowy",
        emailVerifiedAt: NOW,
      })
    })

    it("rejects revoked and expired invitations", async () => {
      const { ctx } = await seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
      ])
      await invite(ctx, "r@a.pl", "revoked")
      await invite(ctx, "e@a.pl", "expired")
      const revoked = await testDb.invitation.findFirstOrThrow({
        where: { email: "r@a.pl" },
      })
      await repo.revokeInvitation(ctx, revoked.id, NOW)

      const accept = (tokenHash: string, now = NOW) =>
        acceptances.accept({
          tokenHash,
          name: "X",
          passwordHash: "h",
          termsVersion: "v",
          now,
        })
      await expect(accept("revoked")).resolves.toEqual({
        ok: false,
        error: "TOKEN_INVALID",
      })
      await expect(accept("expired", at(4 * DAY))).resolves.toEqual({
        ok: false,
        error: "TOKEN_INVALID",
      })
    })

    it("re-checks the seat limit when accepting", async () => {
      const { ctx, companyId } = await seedCompany(
        "A",
        [{ email: "admin@a.pl", role: "ADMIN" }],
        2
      )
      await invite(ctx, "new@a.pl", "tok")
      await testDb.company.update({
        where: { id: companyId },
        data: { userLimit: 1 },
      })

      await expect(
        acceptances.accept({
          tokenHash: "tok",
          name: "X",
          passwordHash: "h",
          termsVersion: "v",
          now: NOW,
        })
      ).resolves.toEqual({ ok: false, error: "USER_LIMIT_REACHED" })
    })
  })

  describe("paged member list", () => {
    async function seedTeam() {
      return seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
        { email: "zofia@a.pl", role: "WORKER" },
        { email: "adam@a.pl", role: "MANAGER" },
        { email: "bartek@a.pl", role: "WORKER" },
      ]).then(async (seed) => {
        const names = ["Admin Główny", "Zofia Zawada", "Adam Nowak", null]
        const phones = [null, "+48600100200", "+48500200300", null]
        for (const [i, id] of seed.userIds.entries()) {
          await testDb.user.update({
            where: { id },
            data: { name: names[i], phone: phones[i] },
          })
        }
        return seed
      })
    }

    it("pages and counts the whole result", async () => {
      const { ctx } = await seedTeam()
      const page2 = await repo.listMembers(ctx, {
        page: 2,
        pageSize: 3,
        filters: {},
      })
      expect(page2.total).toBe(4)
      expect(page2.items).toHaveLength(1)
    })

    it("sorts by name with unnamed members last", async () => {
      const { ctx } = await seedTeam()
      const { items } = await repo.listMembers(ctx, {
        ...ALL,
        sort: { field: "name", dir: "asc" },
      })
      expect(items.map((m) => m.name)).toEqual([
        "Adam Nowak",
        "Admin Główny",
        "Zofia Zawada",
        null,
      ])
    })

    it("filters by name, email, phone digits and roles", async () => {
      const { ctx } = await seedTeam()
      const emails = async (filters: object) =>
        (await repo.listMembers(ctx, { ...ALL, filters })).items
          .map((m) => m.email)
          .sort()

      await expect(emails({ name: "zAwA" })).resolves.toEqual(["zofia@a.pl"])
      await expect(emails({ email: "BART" })).resolves.toEqual(["bartek@a.pl"])
      await expect(emails({ phone: "600 100" })).resolves.toEqual([
        "zofia@a.pl",
      ])
      await expect(emails({ role: ["MANAGER", "ADMIN"] })).resolves.toEqual([
        "adam@a.pl",
        "admin@a.pl",
      ])
    })
  })

  describe("deleting (anonymizing) a member", () => {
    it("wipes personal data, signs out, frees the seat and the email", async () => {
      const { ctx, companyId, userIds } = await seedCompany(
        "A",
        [
          { email: "admin@a.pl", role: "ADMIN" },
          { email: "w@a.pl", role: "WORKER" },
        ],
        2
      )
      const userId = userIds[1]!
      await testDb.user.update({
        where: { id: userId },
        data: { name: "Wiktor", phone: "+48600100200" },
      })
      await testDb.session.create({
        data: { id: "s", userId, companyId, absoluteExpiresAt: at(DAY) },
      })
      await testDb.workingHours.create({
        data: { userId, weekday: 1, startMinute: 480, endMinute: 960 },
      })

      await expect(repo.anonymize(ctx, userId, NOW)).resolves.toBeNull()

      await expect(
        testDb.user.findUniqueOrThrow({ where: { id: userId } })
      ).resolves.toMatchObject({
        email: `deleted+${userId}@deleted.invalid`,
        name: null,
        phone: null,
        status: "DELETED",
        deletedAt: NOW,
      })
      await expect(
        testDb.session.findUniqueOrThrow({ where: { id: "s" } })
      ).resolves.toMatchObject({ revokedAt: NOW })
      await expect(
        testDb.workingHours.count({ where: { userId } })
      ).resolves.toBe(0)

      // Hidden from the list, seat freed, address usable for a new invite.
      await expect(repo.listMembers(ctx, ALL)).resolves.toMatchObject({
        total: 1,
      })
      await expect(repo.seatUsage(ctx, NOW)).resolves.toEqual({
        used: 1,
        limit: 2,
      })
      await expect(invite(ctx, "w@a.pl")).resolves.toMatchObject({
        ok: true,
        existingAccount: false,
      })
    })

    it("treats an already deleted member as unknown", async () => {
      const { ctx, userIds } = await seedCompany("A", [
        { email: "admin@a.pl", role: "ADMIN" },
        { email: "w@a.pl", role: "WORKER" },
      ])
      await repo.anonymize(ctx, userIds[1]!, NOW)
      await expect(repo.anonymize(ctx, userIds[1]!, NOW)).resolves.toBe(
        "NOT_FOUND"
      )
      await expect(repo.setActive(ctx, userIds[1]!, true, NOW)).resolves.toBe(
        "NOT_FOUND"
      )
    })
  })
})
