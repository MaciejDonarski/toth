import { describe, expect, it, vi } from "vitest"

import {
  fakeClock,
  fakeEventLog,
  fakeNotifier,
  fakePasswordHasher,
  fakeRateLimiter,
  fakeTokenService,
  NOW,
} from "../../../../test/fakes/auth-fakes"
import { isAuthError } from "@/core/auth/domain/errors"
import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

import {
  makeCompanyUsers,
  makeInvitationAcceptance,
  MemberChangeRefused,
} from "./company-users"
import type { CompanyUsersRepository } from "./ports/company-users-repository"
import type { InvitationAcceptanceStore } from "./ports/invitation-acceptance-store"

const meta = { ip: "1.2.3.4" }
const ctxFor = (role: Role): TenantContext => ({
  userId: "me",
  companyId: "c1",
  role,
})

function fakeRepo(
  overrides: Partial<CompanyUsersRepository> = {}
): CompanyUsersRepository {
  return {
    listMembers: vi.fn(async () => []),
    listPendingInvitations: vi.fn(async () => []),
    seatUsage: vi.fn(async () => ({ used: 1, limit: 5 })),
    createInvitation: vi.fn(async () => ({
      ok: true as const,
      companyName: "Acme",
      existingAccount: false,
    })),
    revokeInvitation: vi.fn(async () => true),
    changeRole: vi.fn(async () => null),
    setActive: vi.fn(async () => null),
    ...overrides,
  }
}

function setup(repo = fakeRepo(), blocked: string[] = []) {
  const deps = {
    companyUsers: repo,
    tokenService: fakeTokenService(),
    rateLimiter: fakeRateLimiter(blocked),
    notifier: fakeNotifier(),
    events: fakeEventLog(),
    clock: fakeClock(),
  }
  return { deps, users: makeCompanyUsers(deps) }
}

async function codeOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e)
  if (isAuthError(error)) return error.code
  if (error instanceof MemberChangeRefused) return error.reason
  return error
}

describe("company users use cases", () => {
  it("invites with a hashed 72 h token and emails the plain one", async () => {
    const { deps, users } = setup()
    await users.invite(
      ctxFor("ADMIN"),
      { email: "New@A.pl", role: "MANAGER" },
      meta
    )

    expect(deps.companyUsers.createInvitation).toHaveBeenCalledWith(
      ctxFor("ADMIN"),
      {
        email: "new@a.pl",
        role: "MANAGER",
        tokenHash: "hash(token-1)",
        expiresAt: new Date(NOW.getTime() + 72 * 3_600_000),
        now: NOW,
      }
    )
    expect(deps.notifier.sendInvitation).toHaveBeenCalledWith("new@a.pl", {
      token: "token-1",
      companyName: "Acme",
      validForMs: 72 * 3_600_000,
    })
  })

  it("sends no link to an address with an account elsewhere, only a notice", async () => {
    const { deps, users } = setup(
      fakeRepo({
        createInvitation: vi.fn(async () => ({
          ok: true as const,
          companyName: "Acme",
          existingAccount: true,
        })),
      })
    )
    await expect(
      users.invite(
        ctxFor("ADMIN"),
        { email: "taken@b.pl", role: "WORKER" },
        meta
      )
    ).resolves.toBeUndefined()
    expect(deps.notifier.sendInvitation).not.toHaveBeenCalled()
    expect(deps.notifier.sendInvitationToExistingAccount).toHaveBeenCalledWith(
      "taken@b.pl",
      { companyName: "Acme" }
    )
  })

  it("surfaces seat-limit and taken-email refusals", async () => {
    for (const error of ["USER_LIMIT_REACHED", "EMAIL_TAKEN"] as const) {
      const { deps, users } = setup(
        fakeRepo({
          createInvitation: vi.fn(async () => ({ ok: false as const, error })),
        })
      )
      await expect(
        codeOf(
          users.invite(
            ctxFor("ADMIN"),
            { email: "x@a.pl", role: "WORKER" },
            meta
          )
        )
      ).resolves.toBe(error)
      expect(deps.notifier.sendInvitation).not.toHaveBeenCalled()
    }
  })

  it("rate limits invitations per company", async () => {
    const { users } = setup(fakeRepo(), ["invite:company:c1"])
    await expect(
      codeOf(
        users.invite(ctxFor("ADMIN"), { email: "x@a.pl", role: "WORKER" }, meta)
      )
    ).resolves.toBe("RATE_LIMITED")
  })

  it.each([
    ["MANAGER", "invite", () => [{ email: "x@a.pl", role: "WORKER" }]],
    ["MANAGER", "changeRole", () => ["u2", "ADMIN"]],
    ["MANAGER", "setActive", () => ["u2", false]],
    ["WORKER", "overview", () => []],
    ["WORKER", "revokeInvitation", () => ["inv-1"]],
  ] as const)(
    "refuses %s calling %s even if the caller forgot to check",
    async (role, method, args) => {
      const repo = fakeRepo()
      const { users } = setup(repo)
      const call = (users[method] as (...a: unknown[]) => Promise<unknown>)(
        ctxFor(role),
        ...args(),
        meta
      )
      await expect(codeOf(call)).resolves.toBe("FORBIDDEN")
      for (const fn of Object.values(repo)) expect(fn).not.toHaveBeenCalled()
    }
  )

  it("never lets an admin change or disable themselves", async () => {
    const { deps, users } = setup()
    await expect(
      codeOf(users.changeRole(ctxFor("ADMIN"), "me", "WORKER", meta))
    ).resolves.toBe("SELF_CHANGE")
    await expect(
      codeOf(users.setActive(ctxFor("ADMIN"), "me", false, meta))
    ).resolves.toBe("SELF_CHANGE")
    expect(deps.companyUsers.changeRole).not.toHaveBeenCalled()
  })

  it("rejects unknown roles", async () => {
    const { users } = setup()
    await expect(
      users.changeRole(ctxFor("ADMIN"), "u2", "OWNER" as Role, meta)
    ).rejects.toThrow()
  })

  it("passes repository refusals through", async () => {
    const { users } = setup(
      fakeRepo({ setActive: vi.fn(async () => "LAST_ADMIN" as const) })
    )
    await expect(
      codeOf(users.setActive(ctxFor("ADMIN"), "u2", false, meta))
    ).resolves.toBe("LAST_ADMIN")
  })
})

describe("invitation acceptance", () => {
  function setupAccept(
    result: Awaited<ReturnType<InvitationAcceptanceStore["accept"]>>
  ) {
    const acceptances: InvitationAcceptanceStore = {
      findOpen: vi.fn(async () => null),
      accept: vi.fn(async () => result),
    }
    const accept = makeInvitationAcceptance({
      acceptances,
      passwordHasher: fakePasswordHasher(),
      tokenService: fakeTokenService(),
      events: fakeEventLog(),
      clock: fakeClock(),
    })
    return { acceptances, accept }
  }
  const input = {
    name: "Ewa Nowak",
    password: "Zaq1@wsx",
    confirmPassword: "Zaq1@wsx",
    acceptTerms: true,
  }

  it("stores only the password hash and returns the email", async () => {
    const { acceptances, accept } = setupAccept({
      ok: true,
      userId: "u9",
      companyId: "c1",
      email: "ewa@a.pl",
    })
    await expect(accept.accept("tok", input, meta)).resolves.toEqual({
      email: "ewa@a.pl",
    })
    expect(acceptances.accept).toHaveBeenCalledWith({
      tokenHash: "hash(tok)",
      name: "Ewa Nowak",
      passwordHash: "argon(Zaq1@wsx)",
      termsVersion: "2026-11-01",
      now: NOW,
    })
  })

  it("maps store refusals to auth errors", async () => {
    const { accept } = setupAccept({ ok: false, error: "USER_LIMIT_REACHED" })
    await expect(codeOf(accept.accept("tok", input, meta))).resolves.toBe(
      "USER_LIMIT_REACHED"
    )
  })

  it("requires accepting the terms", async () => {
    const { acceptances, accept } = setupAccept({
      ok: false,
      error: "TOKEN_INVALID",
    })
    await expect(
      accept.accept("tok", { ...input, acceptTerms: false }, meta)
    ).rejects.toThrow()
    expect(acceptances.accept).not.toHaveBeenCalled()
  })
})
