import { describe, expect, it, vi } from "vitest"

import {
  fakeClock,
  fakeEventLog,
  fakeNotifier,
  fakeTokenService,
  fakeTrustedDevices,
  fakeUserAccounts,
  InMemoryChallenges,
  NOW,
  userAccount,
} from "../../../../test/fakes/auth-fakes"
import { isAuthError, type AuthErrorCode } from "../domain/errors"
import { makeGetLoginChallenge } from "./login-challenge-view"
import { makeResendLoginCode } from "./resend-login-code"
import { makeVerifyLoginCode } from "./verify-login-code"

const MINUTE = 60_000
const meta = { ip: "1.2.3.4", userAgent: "UA" }

/** A challenge opened at NOW for the cookie token "ct" with code 123456. */
async function setup() {
  const clock = fakeClock()
  const challenges = new InMemoryChallenges()
  await challenges.create({
    id: "hash(ct)",
    userId: "user-1",
    codeHash: "hmac(123456)",
    codeExpiresAt: new Date(NOW.getTime() + 3 * MINUTE),
    expiresAt: new Date(NOW.getTime() + 15 * MINUTE),
    now: NOW,
  })
  const deps = {
    challenges,
    users: fakeUserAccounts({ findById: vi.fn(async () => userAccount()) }),
    trustedDevices: fakeTrustedDevices(),
    tokenService: fakeTokenService(),
    notifier: fakeNotifier(),
    events: fakeEventLog(),
    clock,
  }
  return {
    deps,
    clock,
    challenges,
    verify: makeVerifyLoginCode(deps),
    resend: makeResendLoginCode(deps),
    view: makeGetLoginChallenge(deps),
  }
}

async function errorOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e)
  if (!isAuthError(error))
    throw new Error(`expected AuthError, got ${String(error)}`)
  return error as { code: AuthErrorCode; detail?: Record<string, unknown> }
}

describe("verifyLoginCode", () => {
  it("accepts the right code and issues a grant", async () => {
    const { verify, challenges } = await setup()
    const result = await verify("ct", { code: "123456", remember: false }, meta)

    expect(result).toEqual({ grant: "token-1" })
    expect(challenges.rows.get("hash(ct)")).toMatchObject({
      verifiedAt: NOW,
      grantHash: "hash(token-1)",
    })
  })

  it("trusts the browser for exactly 30 days when asked", async () => {
    const { verify, deps } = await setup()
    const result = await verify("ct", { code: "123456", remember: true }, meta)

    expect(result).toEqual({ grant: "token-1", trustedDeviceToken: "token-2" })
    expect(deps.trustedDevices.create).toHaveBeenCalledWith({
      userId: "user-1",
      tokenHash: "hash(token-2)",
      userAgent: "UA",
      expiresAt: new Date(NOW.getTime() + 30 * 24 * 60 * MINUTE),
      now: NOW,
    })
  })

  it("reports remaining attempts and closes the challenge after 5 misses", async () => {
    const { verify } = await setup()
    const wrong = () => verify("ct", { code: "000000", remember: false }, meta)

    for (const left of [4, 3, 2, 1]) {
      const error = await errorOf(wrong())
      expect(error.code).toBe("CODE_INVALID")
      expect(error.detail).toEqual({ attemptsLeft: left })
    }
    await expect(errorOf(wrong())).resolves.toMatchObject({
      code: "CHALLENGE_INVALID",
    })
    // Even the right code no longer works.
    await expect(
      errorOf(verify("ct", { code: "123456", remember: false }, meta))
    ).resolves.toMatchObject({ code: "CHALLENGE_INVALID" })
  })

  it("rejects an expired code but keeps the challenge for a resend", async () => {
    const { verify, view, clock } = await setup()
    clock.set(new Date(NOW.getTime() + 3 * MINUTE))

    await expect(
      errorOf(verify("ct", { code: "123456", remember: false }, meta))
    ).resolves.toMatchObject({ code: "CODE_EXPIRED" })
    await expect(view("ct")).resolves.not.toBeNull()
  })

  it("closes the challenge after its 15-minute window", async () => {
    const { verify, view, clock } = await setup()
    clock.set(new Date(NOW.getTime() + 15 * MINUTE))

    await expect(
      errorOf(verify("ct", { code: "123456", remember: false }, meta))
    ).resolves.toMatchObject({ code: "CHALLENGE_INVALID" })
    await expect(view("ct")).resolves.toBeNull()
  })

  it("cannot be verified twice", async () => {
    const { verify } = await setup()
    await verify("ct", { code: "123456", remember: false }, meta)
    await expect(
      errorOf(verify("ct", { code: "123456", remember: false }, meta))
    ).resolves.toMatchObject({ code: "CHALLENGE_INVALID" })
  })

  it("rejects a missing or unknown challenge cookie", async () => {
    const { verify } = await setup()
    for (const token of [undefined, "other"]) {
      await expect(
        errorOf(verify(token, { code: "123456", remember: false }, meta))
      ).resolves.toMatchObject({ code: "CHALLENGE_INVALID" })
    }
  })
})

describe("resendLoginCode", () => {
  it("enforces the 60 s cooldown", async () => {
    const { resend, clock } = await setup()
    clock.set(new Date(NOW.getTime() + 30_000))
    await expect(errorOf(resend("ct"))).resolves.toMatchObject({
      code: "RESEND_TOO_SOON",
      detail: { retryAt: new Date(NOW.getTime() + MINUTE) },
    })
  })

  it("replaces the code, restarts its 3 minutes and invalidates the old one", async () => {
    const { resend, verify, clock, deps } = await setup()
    const later = new Date(NOW.getTime() + 2 * MINUTE)
    clock.set(later)

    await expect(resend("ct")).resolves.toEqual({
      codeExpiresAt: new Date(later.getTime() + 3 * MINUTE),
      nextResendAt: new Date(later.getTime() + MINUTE),
      resendsLeft: 4,
    })
    expect(deps.notifier.sendLoginCode).toHaveBeenCalledWith("jan@firma.pl", {
      code: "111111",
      validForMs: 3 * MINUTE,
    })
    await expect(
      errorOf(verify("ct", { code: "123456", remember: false }, meta))
    ).resolves.toMatchObject({ code: "CODE_INVALID" })
    await expect(
      verify("ct", { code: "111111", remember: false }, meta)
    ).resolves.toHaveProperty("grant")
  })

  it("stops after 5 resends", async () => {
    const { resend, clock } = await setup()
    for (let i = 1; i <= 5; i++) {
      clock.set(new Date(NOW.getTime() + i * MINUTE))
      await resend("ct")
    }
    clock.set(new Date(NOW.getTime() + 7 * MINUTE))
    await expect(errorOf(resend("ct"))).resolves.toMatchObject({
      code: "RESEND_LIMIT_REACHED",
    })
  })
})

describe("getLoginChallenge", () => {
  it("exposes only what the code page needs", async () => {
    const { view } = await setup()
    await expect(view("ct")).resolves.toEqual({
      maskedEmail: "j***@firma.pl",
      codeExpiresAt: new Date(NOW.getTime() + 3 * MINUTE),
      nextResendAt: new Date(NOW.getTime() + MINUTE),
      resendsLeft: 5,
    })
  })
})
