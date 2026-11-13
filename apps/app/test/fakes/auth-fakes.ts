import { vi } from "vitest"

import type { AuthEventLog } from "@/core/auth/application/ports/auth-event-log"
import type { AuthNotifier } from "@/core/auth/application/ports/auth-notifier"
import type { Clock } from "@/core/auth/application/ports/clock"
import type {
  LoginChallenge,
  LoginChallengeRepository,
  NewLoginChallenge,
} from "@/core/auth/application/ports/login-challenge-repository"
import type { PasswordHasher } from "@/core/auth/application/ports/password-hasher"
import type { RateLimiter } from "@/core/auth/application/ports/rate-limiter"
import type { TokenService } from "@/core/auth/application/ports/token-service"
import type { TrustedDeviceRepository } from "@/core/auth/application/ports/trusted-device-repository"
import type {
  UserAccount,
  UserAccountRepository,
} from "@/core/auth/application/ports/user-account-repository"

export const NOW = new Date("2026-11-13T10:00:00Z")

export function fakeClock(now = NOW): Clock & { set(date: Date): void } {
  let current = now
  return {
    now: () => current,
    set: (date) => {
      current = date
    },
  }
}

/** Deterministic tokens: token-1, token-2…; hashes are `hash(<value>)`. */
export function fakeTokenService(): TokenService {
  let counter = 0
  return {
    generateToken: vi.fn(() => `token-${++counter}`),
    generateCode: vi.fn((length: number) => "1".repeat(length)),
    hashToken: vi.fn((token: string) => `hash(${token})`),
    hashCode: vi.fn((code: string) => `hmac(${code})`),
    safeEqual: vi.fn((a: string, b: string) => a === b),
  }
}

export function fakePasswordHasher(): PasswordHasher {
  return {
    hash: vi.fn(async (password: string) => `argon(${password})`),
    verify: vi.fn(
      async (hash: string, password: string) => hash === `argon(${password})`
    ),
    verifyDummy: vi.fn(async () => undefined),
  }
}

/** Allows everything unless a key is listed in `blocked`. */
export function fakeRateLimiter(blocked: string[] = []): RateLimiter {
  return {
    hit: vi.fn(async ({ key }) => ({
      allowed: !blocked.includes(key),
      remaining: 0,
      resetAt: new Date(NOW.getTime() + 60_000),
    })),
    reset: vi.fn(async () => undefined),
  }
}

export function fakeNotifier(): {
  [K in keyof AuthNotifier]: ReturnType<typeof vi.fn>
} & AuthNotifier {
  return {
    sendLoginCode: vi.fn(async () => undefined),
    sendEmailVerification: vi.fn(async () => undefined),
    sendRegistrationAttempt: vi.fn(async () => undefined),
    sendPasswordReset: vi.fn(async () => undefined),
    sendPasswordChanged: vi.fn(async () => undefined),
    sendAccountLocked: vi.fn(async () => undefined),
    sendInvitation: vi.fn(async () => undefined),
  }
}

export function fakeEventLog(): AuthEventLog {
  return { record: vi.fn(async () => undefined) }
}

export function userAccount(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    id: "user-1",
    companyId: "company-1",
    email: "jan@firma.pl",
    name: null,
    role: "ADMIN",
    status: "ACTIVE",
    passwordHash: "argon(Zaq1@wsx)",
    emailVerifiedAt: new Date("2026-11-01T00:00:00Z"),
    passwordChangedAt: new Date("2026-11-01T00:00:00Z"),
    failedLoginCount: 0,
    lockedUntil: null,
    ...overrides,
  }
}

/** Every UserAccountRepository method as a mock; override what a test needs. */
export function fakeUserAccounts(
  overrides: Partial<UserAccountRepository> = {}
): UserAccountRepository {
  return {
    findByEmail: vi.fn(async () => null),
    findById: vi.fn(async () => null),
    markEmailVerified: vi.fn(async () => undefined),
    recordFailedLogin: vi.fn(async () => ({ lockedUntil: null })),
    resetFailedLogins: vi.fn(async () => undefined),
    recordLogin: vi.fn(async () => undefined),
    ...overrides,
  }
}

/** In-memory challenge store with the same conditional-update semantics as Prisma. */
export class InMemoryChallenges implements LoginChallengeRepository {
  readonly rows = new Map<
    string,
    LoginChallenge & { grantHash: string | null }
  >()

  async create(c: NewLoginChallenge) {
    this.rows.set(c.id, {
      id: c.id,
      userId: c.userId,
      codeHash: c.codeHash,
      codeExpiresAt: c.codeExpiresAt,
      expiresAt: c.expiresAt,
      attempts: 0,
      resendCount: 0,
      lastSentAt: c.now,
      verifiedAt: c.verified ? c.now : null,
      consumedAt: null,
      viaTrustedDevice: !!c.verified,
      grantHash: c.verified?.grantHash ?? null,
    })
  }

  async findById(id: string) {
    return this.rows.get(id) ?? null
  }

  async registerAttempt(id: string, now: Date, max: number) {
    const row = this.rows.get(id)
    if (
      !row ||
      row.verifiedAt ||
      row.consumedAt ||
      row.expiresAt <= now ||
      row.attempts >= max
    ) {
      return null
    }
    const updated = { ...row, attempts: row.attempts + 1 }
    this.rows.set(id, updated)
    return updated
  }

  async markVerified(id: string, grantHash: string, now: Date) {
    const row = this.rows.get(id)
    if (!row || row.verifiedAt || row.consumedAt || row.expiresAt <= now)
      return false
    this.rows.set(id, { ...row, verifiedAt: now, grantHash })
    return true
  }

  async replaceCode(input: {
    id: string
    codeHash: string
    codeExpiresAt: Date
    now: Date
    expectedResendCount: number
  }) {
    const row = this.rows.get(input.id)
    if (
      !row ||
      row.verifiedAt ||
      row.consumedAt ||
      row.resendCount !== input.expectedResendCount
    ) {
      return false
    }
    this.rows.set(input.id, {
      ...row,
      codeHash: input.codeHash,
      codeExpiresAt: input.codeExpiresAt,
      lastSentAt: input.now,
      resendCount: row.resendCount + 1,
    })
    return true
  }

  async consumeGrant(grantHash: string, now: Date, verifiedAfter: Date) {
    const row = [...this.rows.values()].find((r) => r.grantHash === grantHash)
    if (
      !row ||
      row.consumedAt ||
      !row.verifiedAt ||
      row.verifiedAt < verifiedAfter
    ) {
      return null
    }
    this.rows.set(row.id, { ...row, consumedAt: now })
    return {
      challengeId: row.id,
      userId: row.userId,
      viaTrustedDevice: row.viaTrustedDevice,
    }
  }
}

export function fakeTrustedDevices(
  valid: { id: string } | null = null
): TrustedDeviceRepository {
  return {
    create: vi.fn(async () => undefined),
    findValid: vi.fn(async () => valid),
    touch: vi.fn(async () => undefined),
  }
}
