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
import { isAuthError } from "../domain/errors"
import {
  makeCheckPasswordResetToken,
  makeRequestPasswordReset,
  makeResetPassword,
} from "./password-reset"
import type { AuthTokenRepository } from "./ports/auth-token-repository"
import type { PasswordResetStore } from "./ports/password-reset-store"
import type { UserAccount } from "./ports/user-account-repository"

const meta = { ip: "1.2.3.4", userAgent: "UA" }

function fakeTokens(active = true): AuthTokenRepository {
  return {
    issue: vi.fn(async () => undefined),
    consume: vi.fn(),
    isActive: vi.fn(async () => active),
    latestIssuedAt: vi.fn(),
  }
}

describe("requestPasswordReset", () => {
  function setup({
    user = userAccount() as UserAccount | null,
    blocked = [] as string[],
  } = {}) {
    const deps = {
      users: fakeUserAccounts({ findByEmail: vi.fn(async () => user) }),
      authTokens: fakeTokens(),
      tokenService: fakeTokenService(),
      rateLimiter: fakeRateLimiter(blocked),
      notifier: fakeNotifier(),
      events: fakeEventLog(),
      clock: fakeClock(),
    }
    return { deps, request: makeRequestPasswordReset(deps) }
  }

  it("issues a hashed single-use 30-minute link and emails it", async () => {
    const { deps, request } = setup()
    await request(" JAN@firma.pl ", meta)

    expect(deps.authTokens.issue).toHaveBeenCalledWith({
      userId: "user-1",
      type: "PASSWORD_RESET",
      tokenHash: "hash(token-1)",
      expiresAt: new Date(NOW.getTime() + 30 * 60_000),
      now: NOW,
    })
    expect(deps.notifier.sendPasswordReset).toHaveBeenCalledWith(
      "jan@firma.pl",
      { token: "token-1", validForMs: 30 * 60_000 }
    )
  })

  it.each([
    ["an unknown email", { user: null }],
    ["a disabled account", { user: userAccount({ status: "DISABLED" }) }],
    ["the per-address limit", { blocked: ["reset:email:jan@firma.pl"] }],
  ] as const)("completes silently for %s", async (_label, options) => {
    const { deps, request } = setup(options as Parameters<typeof setup>[0])
    await expect(request("jan@firma.pl", meta)).resolves.toBeUndefined()
    expect(deps.authTokens.issue).not.toHaveBeenCalled()
    expect(deps.notifier.sendPasswordReset).not.toHaveBeenCalled()
  })

  it("also works for an unverified account (the link proves ownership)", async () => {
    const { deps, request } = setup({
      user: userAccount({ emailVerifiedAt: null }),
    })
    await request("jan@firma.pl", meta)
    expect(deps.notifier.sendPasswordReset).toHaveBeenCalled()
  })

  it("throws RATE_LIMITED per IP", async () => {
    const { request } = setup({ blocked: ["reset:ip:1.2.3.4"] })
    const error = await request("jan@firma.pl", meta).catch((e: unknown) => e)
    expect(isAuthError(error, "RATE_LIMITED")).toBe(true)
  })
})

describe("checkPasswordResetToken", () => {
  it("checks the hash without consuming", async () => {
    const authTokens = fakeTokens(true)
    const check = makeCheckPasswordResetToken({
      authTokens,
      tokenService: fakeTokenService(),
      clock: fakeClock(),
    })
    await expect(check("abc")).resolves.toBe(true)
    expect(authTokens.isActive).toHaveBeenCalledWith(
      "hash(abc)",
      "PASSWORD_RESET",
      NOW
    )
    expect(authTokens.consume).not.toHaveBeenCalled()
    await expect(check(undefined)).resolves.toBe(false)
  })
})

describe("resetPassword", () => {
  function setup(
    result: Awaited<ReturnType<PasswordResetStore["resetWithToken"]>>
  ) {
    const deps = {
      resets: { resetWithToken: vi.fn(async () => result) },
      passwordHasher: fakePasswordHasher(),
      tokenService: fakeTokenService(),
      notifier: fakeNotifier(),
      events: fakeEventLog(),
      clock: fakeClock(),
    }
    return { deps, reset: makeResetPassword(deps) }
  }
  const input = { password: "Nowe#Haslo1", confirmPassword: "Nowe#Haslo1" }
  const owner = {
    userId: "user-1",
    companyId: "company-1",
    email: "jan@firma.pl",
  }

  it("stores the new hash atomically with the token and confirms by email", async () => {
    const { deps, reset } = setup(owner)
    await reset("tok", input, meta)

    expect(deps.resets.resetWithToken).toHaveBeenCalledWith({
      tokenHash: "hash(tok)",
      passwordHash: "argon(Nowe#Haslo1)",
      now: NOW,
    })
    expect(deps.notifier.sendPasswordChanged).toHaveBeenCalledWith(
      "jan@firma.pl"
    )
    expect(deps.events.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "password_reset", userId: "user-1" })
    )
  })

  it("rejects used or expired links", async () => {
    const { deps, reset } = setup(null)
    const error = await reset("tok", input, meta).catch((e: unknown) => e)
    expect(isAuthError(error, "TOKEN_INVALID")).toBe(true)
    expect(deps.notifier.sendPasswordChanged).not.toHaveBeenCalled()
  })

  it("enforces the password policy and confirmation", async () => {
    const { deps, reset } = setup(owner)
    await expect(
      reset("tok", { password: "weak", confirmPassword: "weak" }, meta)
    ).rejects.toThrow()
    await expect(
      reset(
        "tok",
        { password: "Nowe#Haslo1", confirmPassword: "Inne#Haslo1" },
        meta
      )
    ).rejects.toThrow()
    expect(deps.resets.resetWithToken).not.toHaveBeenCalled()
  })

  it("keeps the new password when the confirmation mail fails", async () => {
    const { deps, reset } = setup(owner)
    deps.notifier.sendPasswordChanged.mockRejectedValueOnce(new Error("smtp"))
    await expect(reset("tok", input, meta)).resolves.toBeUndefined()
  })
})
