import { describe, expect, it, vi } from "vitest"

import {
  fakeClock,
  fakeNotifier,
  fakeRateLimiter,
  fakeTokenService,
  fakeUserAccounts,
  NOW,
  userAccount,
} from "../../../../test/fakes/auth-fakes"
import { isAuthError } from "../domain/errors"
import type { AuthTokenRepository } from "./ports/auth-token-repository"
import type { UserAccountRepository } from "./ports/user-account-repository"
import { makeResendVerification } from "./resend-verification"

const meta = { ip: "1.2.3.4" }
const unverified = userAccount({ emailVerifiedAt: null })

function setup({
  user = unverified as ReturnType<typeof userAccount> | null,
  lastSent = null as Date | null,
  blocked = [] as string[],
} = {}) {
  const users: UserAccountRepository = {
    ...fakeUserAccounts(),
    findByEmail: vi.fn(async () => user),
    findById: vi.fn(),
    markEmailVerified: vi.fn(),
  }
  const authTokens: AuthTokenRepository = {
    issue: vi.fn(async () => undefined),
    consume: vi.fn(),
    isActive: vi.fn(async () => false),
    latestIssuedAt: vi.fn(async () => lastSent),
  }
  const deps = {
    users,
    authTokens,
    tokenService: fakeTokenService(),
    rateLimiter: fakeRateLimiter(blocked),
    notifier: fakeNotifier(),
    clock: fakeClock(),
  }
  return { deps, resend: makeResendVerification(deps) }
}

describe("resendVerification", () => {
  it("issues a new token (invalidating older ones) and mails it", async () => {
    const { deps, resend } = setup({
      lastSent: new Date(NOW.getTime() - 61_000),
    })
    await resend(" JAN@firma.pl ", meta)

    expect(deps.authTokens.issue).toHaveBeenCalledWith({
      userId: "user-1",
      type: "EMAIL_VERIFICATION",
      tokenHash: "hash(token-1)",
      expiresAt: new Date("2026-11-14T10:00:00Z"),
      now: NOW,
    })
    expect(deps.notifier.sendEmailVerification).toHaveBeenCalledWith(
      "jan@firma.pl",
      expect.objectContaining({ token: "token-1" })
    )
  })

  it.each([
    ["unknown email", { user: null }],
    ["already verified", { user: userAccount() }],
    [
      "disabled account",
      { user: userAccount({ emailVerifiedAt: null, status: "DISABLED" }) },
    ],
    ["inside the cooldown", { lastSent: new Date(NOW.getTime() - 30_000) }],
    [
      "over the per-email limit",
      { blocked: ["verify-resend:email:jan@firma.pl"] },
    ],
  ] as const)("is a silent no-op for %s", async (_label, options) => {
    const { deps, resend } = setup(options as Parameters<typeof setup>[0])
    await expect(resend("jan@firma.pl", meta)).resolves.toBeUndefined()
    expect(deps.notifier.sendEmailVerification).not.toHaveBeenCalled()
    expect(deps.authTokens.issue).not.toHaveBeenCalled()
  })

  it("throws RATE_LIMITED per IP", async () => {
    const { resend } = setup({ blocked: ["verify-resend:ip:1.2.3.4"] })
    const error = await resend("jan@firma.pl", meta).catch((e: unknown) => e)
    expect(isAuthError(error, "RATE_LIMITED")).toBe(true)
  })
})
