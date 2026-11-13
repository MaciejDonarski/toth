import { AUTH_POLICY } from "../domain/auth-policy"
import {
  emailKey,
  enforceRateLimit,
  ipKey,
  withinRateLimit,
} from "./rate-limit"
import type { AuthEventLog } from "./ports/auth-event-log"
import type { AuthNotifier } from "./ports/auth-notifier"
import type { Clock } from "./ports/clock"
import type { PasswordHasher } from "./ports/password-hasher"
import type { RateLimiter } from "./ports/rate-limiter"
import type { RegistrationStore } from "./ports/registration-store"
import type { TokenService } from "./ports/token-service"
import type { UserAccountRepository } from "./ports/user-account-repository"
import type { RequestMeta } from "./request-meta"
import { registerSchema, type RegisterInput } from "./schemas"

export type RegisterCompanyDeps = Readonly<{
  users: UserAccountRepository
  registrations: RegistrationStore
  passwordHasher: PasswordHasher
  tokenService: TokenService
  rateLimiter: RateLimiter
  notifier: AuthNotifier
  events: AuthEventLog
  clock: Clock
}>

/**
 * Use case: register a company together with its first ADMIN user.
 *
 * The outcome is identical whether or not the email is already registered
 * (no account enumeration): the caller always shows "check your inbox". The
 * owner of an existing account gets a heads-up email instead.
 */
export function makeRegisterCompany(deps: RegisterCompanyDeps) {
  const { rateLimits } = AUTH_POLICY

  async function notifyExistingAccount(email: string) {
    const allowed = await withinRateLimit(deps.rateLimiter, {
      key: emailKey("register-attempt", email),
      ...rateLimits.registrationAttemptMailPerEmail,
    })
    if (allowed) await deps.notifier.sendRegistrationAttempt(email)
  }

  return async function registerCompany(
    input: RegisterInput,
    meta: RequestMeta
  ): Promise<void> {
    const data = registerSchema.parse(input)

    await enforceRateLimit(deps.rateLimiter, {
      key: ipKey("register", meta.ip),
      ...rateLimits.registerPerIp,
    })

    // Hash before the lookup so both branches take the same time.
    const passwordHash = await deps.passwordHasher.hash(data.password)

    if (await deps.users.findByEmail(data.email)) {
      await notifyExistingAccount(data.email)
      return
    }

    const now = deps.clock.now()
    const token = deps.tokenService.generateToken()
    const result = await deps.registrations.registerCompanyWithAdmin({
      companyName: data.companyName,
      userLimit: AUTH_POLICY.defaultCompanyUserLimit,
      email: data.email,
      passwordHash,
      termsVersion: AUTH_POLICY.termsVersion,
      termsAcceptedAt: now,
      verificationTokenHash: deps.tokenService.hashToken(token),
      verificationExpiresAt: new Date(
        now.getTime() + AUTH_POLICY.emailVerificationTtlMs
      ),
    })

    if (result === "EMAIL_TAKEN") {
      await notifyExistingAccount(data.email)
      return
    }

    let mailFailed = false
    try {
      await deps.notifier.sendEmailVerification(data.email, {
        token,
        validForMs: AUTH_POLICY.emailVerificationTtlMs,
      })
    } catch {
      // The account exists; the user can request a new link.
      mailFailed = true
    }

    await deps.events.record({
      type: "register",
      userId: result.userId,
      companyId: result.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta: mailFailed ? { mailFailed } : undefined,
    })
  }
}

export type RegisterCompany = ReturnType<typeof makeRegisterCompany>
