import { describe, expect, it, vi } from "vitest"

import {
  fakeClock,
  fakeEventLog,
  fakeTokenService,
  fakeUserAccounts,
  InMemoryChallenges,
  NOW,
  userAccount,
} from "../../../../test/fakes/auth-fakes"
import type {
  SessionRepository,
  StoredSession,
} from "./ports/session-repository"
import type { UserAccount } from "./ports/user-account-repository"
import { makeRedeemLoginGrant } from "./redeem-login-grant"
import { makeRevokeSession, makeValidateSession } from "./validate-session"

const MINUTE = 60_000

function fakeSessions(stored: StoredSession | null = null): SessionRepository {
  return {
    create: vi.fn(async () => undefined),
    findById: vi.fn(async () => stored),
    touch: vi.fn(async () => undefined),
    revoke: vi.fn(async () => undefined),
  }
}

describe("redeemLoginGrant", () => {
  async function setup({
    user = userAccount() as UserAccount | null,
    verifiedAt = NOW,
  } = {}) {
    const clock = fakeClock()
    const challenges = new InMemoryChallenges()
    await challenges.create({
      id: "c1",
      userId: "user-1",
      codeHash: null,
      codeExpiresAt: NOW,
      expiresAt: new Date(NOW.getTime() + 15 * MINUTE),
      now: verifiedAt,
      verified: { grantHash: "hash(grant)" },
    })
    const deps = {
      users: fakeUserAccounts({ findById: vi.fn(async () => user) }),
      challenges,
      sessions: fakeSessions(),
      tokenService: fakeTokenService(),
      events: fakeEventLog(),
      clock,
    }
    return { deps, clock, redeem: makeRedeemLoginGrant(deps) }
  }

  it("creates a hashed 7-day session and records the login", async () => {
    const { deps, redeem } = await setup()
    await expect(redeem("grant", { ip: "1.2.3.4" })).resolves.toEqual({
      userId: "user-1",
      sessionId: "token-1",
    })
    expect(deps.sessions.create).toHaveBeenCalledWith({
      id: "hash(token-1)",
      userId: "user-1",
      companyId: "company-1",
      absoluteExpiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * MINUTE),
      viaTrustedDevice: true,
      now: NOW,
      ip: "1.2.3.4",
      userAgent: undefined,
    })
    expect(deps.users.recordLogin).toHaveBeenCalledWith("user-1", NOW)
  })

  it("is single-use", async () => {
    const { redeem } = await setup()
    await redeem("grant", {})
    await expect(redeem("grant", {})).resolves.toBeNull()
  })

  it("expires 60 s after verification", async () => {
    const { redeem, clock } = await setup()
    clock.set(new Date(NOW.getTime() + 61_000))
    await expect(redeem("grant", {})).resolves.toBeNull()
  })

  it("refuses users that were disabled meanwhile", async () => {
    const { deps, redeem } = await setup({
      user: userAccount({ status: "DISABLED" }),
    })
    await expect(redeem("grant", {})).resolves.toBeNull()
    expect(deps.sessions.create).not.toHaveBeenCalled()
  })
})

describe("validateSession", () => {
  function stored(
    overrides: Partial<StoredSession> = {},
    user: Partial<StoredSession["user"]> = {}
  ): StoredSession {
    return {
      id: "hash(sid)",
      createdAt: new Date(NOW.getTime() - 60 * MINUTE),
      authenticatedAt: new Date(NOW.getTime() - 60 * MINUTE),
      lastSeenAt: new Date(NOW.getTime() - 10 * MINUTE),
      absoluteExpiresAt: new Date(NOW.getTime() + 60 * MINUTE),
      revokedAt: null,
      user: {
        id: "user-1",
        companyId: "company-1",
        email: "jan@firma.pl",
        name: null,
        role: "WORKER",
        status: "ACTIVE",
        passwordChangedAt: new Date(NOW.getTime() - 24 * 60 * MINUTE),
        ...user,
      },
      ...overrides,
    }
  }

  function validate(session: StoredSession | null) {
    const sessions = fakeSessions(session)
    const run = makeValidateSession({
      sessions,
      tokenService: fakeTokenService(),
      clock: fakeClock(),
    })
    return { sessions, run }
  }

  it("returns the user with role permissions and refreshes lastSeenAt", async () => {
    const { sessions, run } = validate(stored())
    await expect(run("sid")).resolves.toEqual({
      id: "user-1",
      companyId: "company-1",
      email: "jan@firma.pl",
      name: null,
      role: "WORKER",
      permissions: [
        "dashboard.view",
        "sessions.manage-own",
        "profile.edit-own",
      ],
    })
    expect(sessions.findById).toHaveBeenCalledWith("hash(sid)")
    expect(sessions.touch).toHaveBeenCalledWith("hash(sid)", NOW)
  })

  it("keeps a session re-authenticated after the password change", async () => {
    const { run } = validate(
      stored(
        { authenticatedAt: new Date(NOW.getTime() - MINUTE) },
        { passwordChangedAt: new Date(NOW.getTime() - 2 * MINUTE) }
      )
    )
    await expect(run("sid")).resolves.not.toBeNull()
  })

  it("throttles lastSeenAt writes", async () => {
    const { sessions, run } = validate(
      stored({ lastSeenAt: new Date(NOW.getTime() - 30_000) })
    )
    await run("sid")
    expect(sessions.touch).not.toHaveBeenCalled()
  })

  it.each([
    ["revoked", stored({ revokedAt: NOW })],
    [
      "idle for an hour",
      stored({ lastSeenAt: new Date(NOW.getTime() - 60 * MINUTE) }),
    ],
    ["past its absolute expiry", stored({ absoluteExpiresAt: NOW })],
    ["owned by a disabled user", stored({}, { status: "DISABLED" })],
    [
      "older than the last password change",
      stored({}, { passwordChangedAt: NOW }),
    ],
    ["unknown", null],
  ])("rejects a session that is %s", async (_label, session) => {
    const { sessions, run } = validate(session)
    await expect(run("sid")).resolves.toBeNull()
    expect(sessions.touch).not.toHaveBeenCalled()
  })

  it("rejects a missing session id without a lookup", async () => {
    const { sessions, run } = validate(stored())
    await expect(run(undefined)).resolves.toBeNull()
    expect(sessions.findById).not.toHaveBeenCalled()
  })
})

describe("revokeSession", () => {
  it("revokes by hash and logs the logout", async () => {
    const sessions = fakeSessions()
    const events = fakeEventLog()
    const revoke = makeRevokeSession({
      sessions,
      events,
      tokenService: fakeTokenService(),
      clock: fakeClock(),
    })
    await revoke("sid", null, {})
    expect(sessions.revoke).toHaveBeenCalledWith("hash(sid)", NOW)
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "logout" })
    )
  })
})
