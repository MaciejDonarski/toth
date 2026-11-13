import "server-only"

import type { AuthEventLog } from "@/core/auth/application/ports/auth-event-log"
import type { AuthNotifier } from "@/core/auth/application/ports/auth-notifier"
import type { Clock } from "@/core/auth/application/ports/clock"
import type { PasswordHasher } from "@/core/auth/application/ports/password-hasher"
import type { RateLimiter } from "@/core/auth/application/ports/rate-limiter"
import type { TokenService } from "@/core/auth/application/ports/token-service"
import { makeGetGreeting } from "@/core/greeting/application/get-greeting"
import type { Mailer } from "@/core/notifications/application/ports/mailer"
import { Argon2PasswordHasher } from "@/infrastructure/auth/argon2-password-hasher"
import { NodeCryptoTokenService } from "@/infrastructure/auth/node-crypto-token-service"
import { PrismaAuthEventLog } from "@/infrastructure/auth/prisma-auth-event-log"
import { PrismaRateLimiter } from "@/infrastructure/auth/prisma-rate-limiter"
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
  })
  return authInfrastructure
}
