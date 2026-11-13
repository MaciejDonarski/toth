import { describe, expect, it, vi } from "vitest"

import {
  fakeClock,
  fakeEventLog,
  fakeNotifier,
  fakePasswordHasher,
  fakeRateLimiter,
  fakeTokenService,
  fakeTrustedDevices,
  fakeUserAccounts,
  InMemoryChallenges,
  NOW,
  userAccount,
} from "../../../../test/fakes/auth-fakes"
import { isAuthError, type AuthErrorCode } from "../domain/errors"
import type { UserAccount } from "./ports/user-account-repository"
import { makeStartLogin } from "./start-login"

const meta = { ip: "1.2.3.4", userAgent: "UA" }
const credentials = { email: "Jan@Firma.pl", password: "Zaq1@wsx" }

function setup({
  user = userAccount() as UserAccount | null,
  device = null as { id: string } | null,
  blocked = [] as string[],
  lockedUntil = null as Date | null,
} = {}) {
  const users = fakeUserAccounts({
    findByEmail: vi.fn(async () => user),
    recordFailedLogin: vi.fn(async () => ({ lockedUntil })),
  })
  const challenges = new InMemoryChallenges()
  const deps = {
    users,
    challenges,
    trustedDevices: fakeTrustedDevices(device),
    passwordHasher: fakePasswordHasher(),
    tokenService: fakeTokenService(),
    rateLimiter: fakeRateLimiter(blocked),
    notifier: fakeNotifier(),
    events: fakeEventLog(),
    clock: fakeClock(),
  }
  return { deps, challenges, startLogin: makeStartLogin(deps) }
}

async function errorCode(
  promise: Promise<unknown>
): Promise<AuthErrorCode | undefined> {
  const error = await promise.catch((e: unknown) => e)
  return isAuthError(error) ? error.code : undefined
}

describe("startLogin", () => {
  it("emails a 6-digit code valid for 3 minutes and opens a challenge", async () => {
    const { deps, challenges, startLogin } = setup()
    const result = await startLogin(credentials, meta)

    expect(result).toEqual({
      kind: "code-sent",
      challengeToken: "token-1",
      maskedEmail: "j***@firma.pl",
      codeExpiresAt: new Date(NOW.getTime() + 3 * 60_000),
      nextResendAt: new Date(NOW.getTime() + 60_000),
      resendsLeft: 5,
    })
    expect(deps.notifier.sendLoginCode).toHaveBeenCalledWith("jan@firma.pl", {
      code: "111111",
      validForMs: 180_000,
    })
    // Stored by hash only; code as HMAC.
    expect(challenges.rows.get("hash(token-1)")).toMatchObject({
      userId: "user-1",
      codeHash: "hmac(111111)",
      expiresAt: new Date(NOW.getTime() + 15 * 60_000),
      verifiedAt: null,
    })
  })

  it("skips the code for a valid trusted device", async () => {
    const { deps, challenges, startLogin } = setup({ device: { id: "dev-1" } })
    const result = await startLogin(credentials, meta, "device-token")

    expect(result).toEqual({ kind: "granted", grant: "token-2" })
    expect(deps.trustedDevices.findValid).toHaveBeenCalledWith({
      tokenHash: "hash(device-token)",
      userId: "user-1",
      now: NOW,
      trustedSince: userAccount().passwordChangedAt,
    })
    expect(deps.trustedDevices.touch).toHaveBeenCalledWith("dev-1", NOW)
    expect(deps.notifier.sendLoginCode).not.toHaveBeenCalled()
    expect(challenges.rows.get("hash(token-1)")).toMatchObject({
      verifiedAt: NOW,
      viaTrustedDevice: true,
      grantHash: "hash(token-2)",
    })
  })

  it("falls back to the code when the trusted device is not valid", async () => {
    const { deps, startLogin } = setup({ device: null })
    const result = await startLogin(credentials, meta, "stale-device-token")

    expect(result.kind).toBe("code-sent")
    expect(deps.notifier.sendLoginCode).toHaveBeenCalled()
  })

  it("rejects unknown emails like wrong passwords, burning equal time", async () => {
    const { deps, startLogin } = setup({ user: null })
    await expect(errorCode(startLogin(credentials, meta))).resolves.toBe(
      "INVALID_CREDENTIALS"
    )
    expect(deps.passwordHasher.verifyDummy).toHaveBeenCalledWith("Zaq1@wsx")
  })

  it("counts a wrong password", async () => {
    const { deps, startLogin } = setup()
    await expect(
      errorCode(startLogin({ ...credentials, password: "wrong" }, meta))
    ).resolves.toBe("INVALID_CREDENTIALS")

    expect(deps.users.recordFailedLogin).toHaveBeenCalledWith({
      userId: "user-1",
      now: NOW,
      maxAttempts: 5,
      lockoutMs: 15 * 60_000,
    })
    expect(deps.events.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "login_failed" })
    )
    expect(deps.notifier.sendAccountLocked).not.toHaveBeenCalled()
  })

  it("notifies the owner when the 5th failure locks the account", async () => {
    const { deps, startLogin } = setup({
      lockedUntil: new Date(NOW.getTime() + 15 * 60_000),
    })
    await startLogin({ ...credentials, password: "wrong" }, meta).catch(
      () => {}
    )

    expect(deps.events.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "login_locked" })
    )
    expect(deps.notifier.sendAccountLocked).toHaveBeenCalledWith(
      "jan@firma.pl",
      {
        lockedForMs: 15 * 60_000,
      }
    )
  })

  it("reveals a lock only after the correct password", async () => {
    const locked = userAccount({
      lockedUntil: new Date(NOW.getTime() + 60_000),
    })

    const wrong = setup({ user: locked })
    await expect(
      errorCode(wrong.startLogin({ ...credentials, password: "wrong" }, meta))
    ).resolves.toBe("INVALID_CREDENTIALS")
    expect(wrong.deps.users.recordFailedLogin).not.toHaveBeenCalled()

    const right = setup({ user: locked })
    await expect(errorCode(right.startLogin(credentials, meta))).resolves.toBe(
      "ACCOUNT_LOCKED"
    )
    expect(right.deps.notifier.sendLoginCode).not.toHaveBeenCalled()
  })

  it("lets the user in again once the lock has expired", async () => {
    const { startLogin } = setup({
      user: userAccount({ lockedUntil: new Date(NOW.getTime() - 1) }),
    })
    await expect(startLogin(credentials, meta)).resolves.toMatchObject({
      kind: "code-sent",
    })
  })

  it("treats disabled accounts as invalid credentials", async () => {
    const { startLogin } = setup({ user: userAccount({ status: "DISABLED" }) })
    await expect(errorCode(startLogin(credentials, meta))).resolves.toBe(
      "INVALID_CREDENTIALS"
    )
  })

  it("requires a verified email", async () => {
    const { deps, startLogin } = setup({
      user: userAccount({ emailVerifiedAt: null }),
    })
    await expect(errorCode(startLogin(credentials, meta))).resolves.toBe(
      "EMAIL_NOT_VERIFIED"
    )
    expect(deps.notifier.sendLoginCode).not.toHaveBeenCalled()
  })

  it("resets the failure counter after a correct password", async () => {
    const { deps, startLogin } = setup({
      user: userAccount({ failedLoginCount: 3 }),
    })
    await startLogin(credentials, meta)
    expect(deps.users.resetFailedLogins).toHaveBeenCalledWith("user-1")
  })

  it.each(["login:ip:1.2.3.4", "login:email:jan@firma.pl"])(
    "rate limits by %s before checking the password",
    async (key) => {
      const { deps, startLogin } = setup({ blocked: [key] })
      await expect(errorCode(startLogin(credentials, meta))).resolves.toBe(
        "RATE_LIMITED"
      )
      expect(deps.passwordHasher.verify).not.toHaveBeenCalled()
    }
  )
})
