import "server-only"

import type { AuthEventLog } from "@/core/auth/application/ports/auth-event-log"
import type { AuthTokenRepository } from "@/core/auth/application/ports/auth-token-repository"
import type { AuthNotifier } from "@/core/auth/application/ports/auth-notifier"
import type { Clock } from "@/core/auth/application/ports/clock"
import type { PasswordHasher } from "@/core/auth/application/ports/password-hasher"
import type { RateLimiter } from "@/core/auth/application/ports/rate-limiter"
import type { RegistrationStore } from "@/core/auth/application/ports/registration-store"
import type { TokenService } from "@/core/auth/application/ports/token-service"
import type { UserAccountRepository } from "@/core/auth/application/ports/user-account-repository"
import { makeRegisterCompany } from "@/core/auth/application/register-company"
import { makeResendVerification } from "@/core/auth/application/resend-verification"
import { makeVerifyEmail } from "@/core/auth/application/verify-email"
import { makeGetGreeting } from "@/core/greeting/application/get-greeting"
import type { Mailer } from "@/core/notifications/application/ports/mailer"
import { Argon2PasswordHasher } from "@/infrastructure/auth/argon2-password-hasher"
import { NodeCryptoTokenService } from "@/infrastructure/auth/node-crypto-token-service"
import { PrismaAuthEventLog } from "@/infrastructure/auth/prisma-auth-event-log"
import { PrismaAuthTokenRepository } from "@/infrastructure/auth/prisma-auth-token-repository"
import { PrismaRateLimiter } from "@/infrastructure/auth/prisma-rate-limiter"
import { PrismaRegistrationStore } from "@/infrastructure/auth/prisma-registration-store"
import { PrismaUserAccountRepository } from "@/infrastructure/auth/prisma-user-account-repository"
import { SystemClock } from "@/infrastructure/auth/system-clock"
import { getServerEnv } from "@/infrastructure/config/env"
import { getPrisma } from "@/infrastructure/db/prisma-client"
import { InMemoryGreetingRepository } from "@/infrastructure/greeting/in-memory-greeting-repository"
import { MailAuthNotifier } from "@/infrastructure/mail/mail-auth-notifier"
import { ResendMailer } from "@/infrastructure/mail/resend-mailer"
import { SmtpMailer } from "@/infrastructure/mail/smtp-mailer"

/**
 * Composition root: the only place that wires ports to concrete adapters.
 * Driving adapters (Next.js routes, server actions) import use cases from here.
 *
 * Infrastructure that needs env or a database is built lazily on first use,
 * so importing this module (e.g. in unit tests) has no side effects.
 */
const greetingRepository = new InMemoryGreetingRepository()

export const getGreeting = makeGetGreeting({ greetingRepository })

// --- Auth infrastructure ------------------------------------------------------

export type AuthInfrastructure = Readonly<{
  clock: Clock
  passwordHasher: PasswordHasher
  tokenService: TokenService
  rateLimiter: RateLimiter
  authEventLog: AuthEventLog
  mailer: Mailer
  authNotifier: AuthNotifier
  users: UserAccountRepository
  registrations: RegistrationStore
  authTokens: AuthTokenRepository
}>

let authInfrastructure: AuthInfrastructure | undefined

function createMailer(): Mailer {
  const env = getServerEnv()
  if (env.MAIL_TRANSPORT === "resend") {
    // Presence is guaranteed by the env schema refinement.
    return new ResendMailer(env.RESEND_API_KEY ?? "", env.MAIL_FROM)
  }
  return new SmtpMailer({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    from: env.MAIL_FROM,
  })
}

export function getAuthInfrastructure(): AuthInfrastructure {
  if (authInfrastructure) return authInfrastructure

  const env = getServerEnv()
  const db = getPrisma()
  const clock = new SystemClock()
  const mailer = createMailer()

  authInfrastructure = Object.freeze({
    clock,
    passwordHasher: new Argon2PasswordHasher(),
    tokenService: new NodeCryptoTokenService(env.AUTH_SECRET),
    rateLimiter: new PrismaRateLimiter(db, clock),
    authEventLog: new PrismaAuthEventLog(db),
    mailer,
    authNotifier: new MailAuthNotifier(mailer, env.appUrl),
    users: new PrismaUserAccountRepository(db),
    registrations: new PrismaRegistrationStore(db),
    authTokens: new PrismaAuthTokenRepository(db),
  })
  return authInfrastructure
}

// --- Auth use cases -------------------------------------------------------------

function createAuthUseCases() {
  const infra = getAuthInfrastructure()
  const common = {
    users: infra.users,
    tokenService: infra.tokenService,
    rateLimiter: infra.rateLimiter,
    notifier: infra.authNotifier,
    events: infra.authEventLog,
    clock: infra.clock,
  }
  return {
    registerCompany: makeRegisterCompany({
      ...common,
      registrations: infra.registrations,
      passwordHasher: infra.passwordHasher,
    }),
    resendVerification: makeResendVerification({
      ...common,
      authTokens: infra.authTokens,
    }),
    verifyEmail: makeVerifyEmail({ ...common, authTokens: infra.authTokens }),
  }
}

let authUseCases: ReturnType<typeof createAuthUseCases> | undefined

function getAuthUseCases() {
  authUseCases ??= createAuthUseCases()
  return authUseCases
}

type UseCases = ReturnType<typeof createAuthUseCases>

export const registerCompany: UseCases["registerCompany"] = (...args) =>
  getAuthUseCases().registerCompany(...args)

export const resendVerification: UseCases["resendVerification"] = (...args) =>
  getAuthUseCases().resendVerification(...args)

export const verifyEmail: UseCases["verifyEmail"] = (...args) =>
  getAuthUseCases().verifyEmail(...args)
