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
import type { RegistrationStore } from "./ports/registration-store"
import type { UserAccountRepository } from "./ports/user-account-repository"
import { makeRegisterCompany } from "./register-company"

const input = {
  name: " Jan Kowalski ",
  companyName: "Acme",
  email: "Jan@Firma.pl",
  password: "Zaq1@wsx",
  confirmPassword: "Zaq1@wsx",
  acceptTerms: true,
}
const meta = { ip: "1.2.3.4", userAgent: "UA" }

function setup({
  existing = null as ReturnType<typeof userAccount> | null,
  storeResult = { userId: "u1", companyId: "c1" } as
    { userId: string; companyId: string } | "EMAIL_TAKEN",
  blocked = [] as string[],
} = {}) {
  const users: UserAccountRepository = {
    ...fakeUserAccounts(),
    findByEmail: vi.fn(async () => existing),
    findById: vi.fn(),
    markEmailVerified: vi.fn(),
  }
  const registrations: RegistrationStore = {
    registerCompanyWithAdmin: vi.fn(async () => storeResult),
  }
  const deps = {
    users,
    registrations,
    passwordHasher: fakePasswordHasher(),
    tokenService: fakeTokenService(),
    rateLimiter: fakeRateLimiter(blocked),
    notifier: fakeNotifier(),
    events: fakeEventLog(),
    clock: fakeClock(),
  }
  return { deps, registerCompany: makeRegisterCompany(deps) }
}

describe("registerCompany", () => {
  it("creates the company, its admin and a hashed 24h verification token", async () => {
    const { deps, registerCompany } = setup()
    await registerCompany(input, meta)

    expect(deps.registrations.registerCompanyWithAdmin).toHaveBeenCalledWith({
      companyName: "Acme",
      name: "Jan Kowalski",
      userLimit: 5,
      email: "jan@firma.pl",
      passwordHash: "argon(Zaq1@wsx)",
      termsVersion: "2026-11-01",
      termsAcceptedAt: NOW,
      verificationTokenHash: "hash(token-1)",
      verificationExpiresAt: new Date("2026-11-14T10:00:00Z"),
    })
    expect(deps.notifier.sendEmailVerification).toHaveBeenCalledWith(
      "jan@firma.pl",
      { token: "token-1", validForMs: 24 * 3_600_000 }
    )
    expect(deps.events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "register",
        userId: "u1",
        companyId: "c1",
      })
    )
  })

  it("does not reveal an existing account and warns its owner", async () => {
    const { deps, registerCompany } = setup({ existing: userAccount() })
    await expect(registerCompany(input, meta)).resolves.toBeUndefined()

    expect(deps.passwordHasher.hash).toHaveBeenCalled() // same timing
    expect(deps.registrations.registerCompanyWithAdmin).not.toHaveBeenCalled()
    expect(deps.notifier.sendEmailVerification).not.toHaveBeenCalled()
    expect(deps.notifier.sendRegistrationAttempt).toHaveBeenCalledWith(
      "jan@firma.pl"
    )
  })

  it("treats a concurrent duplicate like an existing account", async () => {
    const { deps, registerCompany } = setup({ storeResult: "EMAIL_TAKEN" })
    await registerCompany(input, meta)

    expect(deps.notifier.sendRegistrationAttempt).toHaveBeenCalled()
    expect(deps.notifier.sendEmailVerification).not.toHaveBeenCalled()
  })

  it("caps heads-up mails per address", async () => {
    const { deps, registerCompany } = setup({
      existing: userAccount(),
      blocked: ["register-attempt:email:jan@firma.pl"],
    })
    await registerCompany(input, meta)
    expect(deps.notifier.sendRegistrationAttempt).not.toHaveBeenCalled()
  })

  it("rate limits per IP before doing any work", async () => {
    const { deps, registerCompany } = setup({
      blocked: ["register:ip:1.2.3.4"],
    })
    const error = await registerCompany(input, meta).catch((e: unknown) => e)

    expect(isAuthError(error, "RATE_LIMITED")).toBe(true)
    expect(deps.passwordHasher.hash).not.toHaveBeenCalled()
  })

  it("re-validates input on the server", async () => {
    const { deps, registerCompany } = setup()
    await expect(
      registerCompany({ ...input, acceptTerms: false }, meta)
    ).rejects.toThrow()
    expect(deps.registrations.registerCompanyWithAdmin).not.toHaveBeenCalled()
  })

  it("keeps the registration when the verification mail fails", async () => {
    const { deps, registerCompany } = setup()
    deps.notifier.sendEmailVerification.mockRejectedValueOnce(new Error("smtp"))

    await expect(registerCompany(input, meta)).resolves.toBeUndefined()
    expect(deps.events.record).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { mailFailed: true } })
    )
  })
})
