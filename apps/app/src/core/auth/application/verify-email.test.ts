import { describe, expect, it, vi } from "vitest"

import {
  fakeClock,
  fakeEventLog,
  fakeTokenService,
  fakeUserAccounts,
  NOW,
  userAccount,
} from "../../../../test/fakes/auth-fakes"
import { isAuthError } from "../domain/errors"
import type { AuthTokenRepository } from "./ports/auth-token-repository"
import type { UserAccountRepository } from "./ports/user-account-repository"
import { makeVerifyEmail } from "./verify-email"

function setup(consumed: { userId: string } | null = { userId: "user-1" }) {
  const users: UserAccountRepository = {
    ...fakeUserAccounts(),
    findByEmail: vi.fn(),
    findById: vi.fn(async () => userAccount({ emailVerifiedAt: null })),
    markEmailVerified: vi.fn(async () => undefined),
  }
  const authTokens: AuthTokenRepository = {
    issue: vi.fn(),
    consume: vi.fn(async () => consumed),
    latestIssuedAt: vi.fn(),
  }
  const deps = {
    users,
    authTokens,
    tokenService: fakeTokenService(),
    events: fakeEventLog(),
    clock: fakeClock(),
  }
  return { deps, verifyEmail: makeVerifyEmail(deps) }
}

describe("verifyEmail", () => {
  it("consumes the hashed token and marks the email verified", async () => {
    const { deps, verifyEmail } = setup()
    await verifyEmail("abc", {})

    expect(deps.authTokens.consume).toHaveBeenCalledWith(
      "hash(abc)",
      "EMAIL_VERIFICATION",
      NOW
    )
    expect(deps.users.markEmailVerified).toHaveBeenCalledWith("user-1", NOW)
    expect(deps.events.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "email_verified", userId: "user-1" })
    )
  })

  it("rejects unknown, used or expired tokens", async () => {
    const { deps, verifyEmail } = setup(null)
    const error = await verifyEmail("abc", {}).catch((e: unknown) => e)

    expect(isAuthError(error, "TOKEN_INVALID")).toBe(true)
    expect(deps.users.markEmailVerified).not.toHaveBeenCalled()
  })

  it("rejects an empty token without touching storage", async () => {
    const { deps, verifyEmail } = setup()
    await expect(verifyEmail("", {})).rejects.toThrow("TOKEN_INVALID")
    expect(deps.authTokens.consume).not.toHaveBeenCalled()
  })
})
