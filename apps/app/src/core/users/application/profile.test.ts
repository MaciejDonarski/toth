import { describe, expect, it, vi } from "vitest"

import {
  fakeClock,
  fakeEventLog,
  fakeNotifier,
  fakePasswordHasher,
  fakeRateLimiter,
  fakeTokenService,
  fakeUserAccounts,
  NOW,
  userAccount,
} from "../../../../test/fakes/auth-fakes"
import { isAuthError } from "@/core/auth/domain/errors"
import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

import type {
  PasswordChangeStore,
  ProfileRepository,
} from "./ports/profile-repository"
import { makeProfile } from "./profile"

const meta = { ip: "1.2.3.4" }
const ctxFor = (role: Role = "WORKER"): TenantContext => ({
  userId: "user-1",
  companyId: "company-1",
  role,
})

const off = (weekday: number) => ({
  weekday: weekday as 1,
  enabled: false,
  start: "",
  end: "",
})
const week = [1, 2, 3, 4, 5, 6, 7].map(off)

function setup({
  account = userAccount() as ReturnType<typeof userAccount> | null,
  blocked = [] as string[],
} = {}) {
  const profiles: ProfileRepository = {
    getOwn: vi.fn(async () => ({
      name: "Jan",
      email: "jan@firma.pl",
      phone: null,
      color: "blue" as const,
      role: "WORKER" as const,
      schedule: {},
    })),
    updateOwn: vi.fn(async () => true),
  }
  const passwordChanges: PasswordChangeStore = {
    change: vi.fn(async () => true),
  }
  const deps = {
    profiles,
    passwordChanges,
    users: fakeUserAccounts({ findById: vi.fn(async () => account) }),
    passwordHasher: fakePasswordHasher(),
    tokenService: fakeTokenService(),
    rateLimiter: fakeRateLimiter(blocked),
    notifier: fakeNotifier(),
    events: fakeEventLog(),
    clock: fakeClock(),
  }
  return { deps, profile: makeProfile(deps) }
}

const change = {
  currentPassword: "Zaq1@wsx",
  newPassword: "Nowe#Haslo1",
  confirmPassword: "Nowe#Haslo1",
}

async function codeOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e)
  return isAuthError(error) ? error.code : error
}

describe("profile use cases", () => {
  it("saves the normalized profile of the caller only", async () => {
    const { deps, profile } = setup()
    await profile.update(
      ctxFor(),
      {
        name: " Jan Kowalski ",
        phone: "600 100 200",
        color: "teal",
        days: week.map((d) =>
          d.weekday === 1
            ? { ...d, enabled: true, start: "08:00", end: "16:00" }
            : d
        ),
      },
      meta
    )
    expect(deps.profiles.updateOwn).toHaveBeenCalledWith(ctxFor(), {
      name: "Jan Kowalski",
      phone: "+48600100200",
      color: "teal",
      schedule: { 1: { start: 480, end: 960 } },
    })
    expect(deps.events.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "profile_updated", userId: "user-1" })
    )
  })

  it("rejects invalid input on the server too", async () => {
    const { deps, profile } = setup()
    await expect(
      profile.update(
        ctxFor(),
        { name: "", phone: "123", color: "teal", days: week },
        meta
      )
    ).rejects.toThrow()
    expect(deps.profiles.updateOwn).not.toHaveBeenCalled()
  })

  it("changes the password keeping the current session", async () => {
    const { deps, profile } = setup()
    await profile.changePassword(ctxFor(), "sid-1", change, meta)

    expect(deps.passwordChanges.change).toHaveBeenCalledWith(ctxFor(), {
      currentSessionHash: "hash(sid-1)",
      passwordHash: "argon(Nowe#Haslo1)",
      now: NOW,
    })
    expect(deps.notifier.sendPasswordChanged).toHaveBeenCalledWith(
      "jan@firma.pl"
    )
  })

  it("refuses a wrong current password", async () => {
    const { deps, profile } = setup()
    await expect(
      codeOf(
        profile.changePassword(
          ctxFor(),
          "sid-1",
          { ...change, currentPassword: "Bad#Pass1" },
          meta
        )
      )
    ).resolves.toBe("INVALID_CREDENTIALS")
    expect(deps.passwordChanges.change).not.toHaveBeenCalled()
  })

  it("rate limits password changes per user", async () => {
    const { deps, profile } = setup({
      blocked: ["password-change:user:user-1"],
    })
    await expect(
      codeOf(profile.changePassword(ctxFor(), "sid-1", change, meta))
    ).resolves.toBe("RATE_LIMITED")
    expect(deps.passwordHasher.verify).not.toHaveBeenCalled()
  })

  it("refuses an account from another company", async () => {
    const { profile } = setup({
      account: userAccount({ companyId: "other-company" }),
    })
    await expect(
      codeOf(profile.changePassword(ctxFor(), "sid-1", change, meta))
    ).resolves.toBe("FORBIDDEN")
  })

  it("needs the current session id", async () => {
    const { profile } = setup()
    await expect(
      codeOf(profile.changePassword(ctxFor(), undefined, change, meta))
    ).resolves.toBe("FORBIDDEN")
  })
})
