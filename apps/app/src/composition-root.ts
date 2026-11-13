import "server-only"

import type { AuthEventLog } from "@/core/auth/application/ports/auth-event-log"
import type { AuthTokenRepository } from "@/core/auth/application/ports/auth-token-repository"
import type { AuthNotifier } from "@/core/auth/application/ports/auth-notifier"
import type { Clock } from "@/core/auth/application/ports/clock"
import type { LoginChallengeRepository } from "@/core/auth/application/ports/login-challenge-repository"
import type { PasswordHasher } from "@/core/auth/application/ports/password-hasher"
import type { PasswordResetStore } from "@/core/auth/application/ports/password-reset-store"
import type { RateLimiter } from "@/core/auth/application/ports/rate-limiter"
import type { RegistrationStore } from "@/core/auth/application/ports/registration-store"
import type { SessionRepository } from "@/core/auth/application/ports/session-repository"
import type { TokenService } from "@/core/auth/application/ports/token-service"
import type { TrustedDeviceRepository } from "@/core/auth/application/ports/trusted-device-repository"
import type { UserAccountRepository } from "@/core/auth/application/ports/user-account-repository"
import { makeGetLoginChallenge } from "@/core/auth/application/login-challenge-view"
import {
  makeCheckPasswordResetToken,
  makeRequestPasswordReset,
  makeResetPassword,
} from "@/core/auth/application/password-reset"
import { makeRedeemLoginGrant } from "@/core/auth/application/redeem-login-grant"
import { makeRegisterCompany } from "@/core/auth/application/register-company"
import { makeResendLoginCode } from "@/core/auth/application/resend-login-code"
import { makeResendVerification } from "@/core/auth/application/resend-verification"
import { makeStartLogin } from "@/core/auth/application/start-login"
import {
  makeRevokeSession,
  makeValidateSession,
} from "@/core/auth/application/validate-session"
import { makeVerifyEmail } from "@/core/auth/application/verify-email"
import { makeVerifyLoginCode } from "@/core/auth/application/verify-login-code"
import { makeGetGreeting } from "@/core/greeting/application/get-greeting"
import {
  makeCompanyUsers,
  makeInvitationAcceptance,
} from "@/core/users/application/company-users"
import type { Mailer } from "@/core/notifications/application/ports/mailer"
import { Argon2PasswordHasher } from "@/infrastructure/auth/argon2-password-hasher"
import { NodeCryptoTokenService } from "@/infrastructure/auth/node-crypto-token-service"
import { PrismaAuthEventLog } from "@/infrastructure/auth/prisma-auth-event-log"
import { PrismaAuthTokenRepository } from "@/infrastructure/auth/prisma-auth-token-repository"
import { PrismaLoginChallengeRepository } from "@/infrastructure/auth/prisma-login-challenge-repository"
import { PrismaPasswordResetStore } from "@/infrastructure/auth/prisma-password-reset-store"
import { PrismaRateLimiter } from "@/infrastructure/auth/prisma-rate-limiter"
import { PrismaRegistrationStore } from "@/infrastructure/auth/prisma-registration-store"
import { PrismaSessionRepository } from "@/infrastructure/auth/prisma-session-repository"
import { PrismaTrustedDeviceRepository } from "@/infrastructure/auth/prisma-trusted-device-repository"
import { PrismaUserAccountRepository } from "@/infrastructure/auth/prisma-user-account-repository"
import { SystemClock } from "@/infrastructure/auth/system-clock"
import { getServerEnv } from "@/infrastructure/config/env"
import { getPrisma } from "@/infrastructure/db/prisma-client"
import { InMemoryGreetingRepository } from "@/infrastructure/greeting/in-memory-greeting-repository"
import { MailAuthNotifier } from "@/infrastructure/mail/mail-auth-notifier"
import { PrismaCompanyUsersRepository } from "@/infrastructure/users/prisma-company-users-repository"
import { PrismaInvitationAcceptanceStore } from "@/infrastructure/users/prisma-invitation-acceptance-store"
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
  challenges: LoginChallengeRepository
  trustedDevices: TrustedDeviceRepository
  sessions: SessionRepository
  passwordResets: PasswordResetStore
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
    challenges: new PrismaLoginChallengeRepository(db),
    trustedDevices: new PrismaTrustedDeviceRepository(db),
    sessions: new PrismaSessionRepository(db),
    passwordResets: new PrismaPasswordResetStore(db),
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
    startLogin: makeStartLogin({
      ...common,
      challenges: infra.challenges,
      trustedDevices: infra.trustedDevices,
      passwordHasher: infra.passwordHasher,
    }),
    getLoginChallenge: makeGetLoginChallenge({
      ...common,
      challenges: infra.challenges,
    }),
    resendLoginCode: makeResendLoginCode({
      ...common,
      challenges: infra.challenges,
    }),
    verifyLoginCode: makeVerifyLoginCode({
      ...common,
      challenges: infra.challenges,
      trustedDevices: infra.trustedDevices,
    }),
    redeemLoginGrant: makeRedeemLoginGrant({
      ...common,
      challenges: infra.challenges,
      sessions: infra.sessions,
    }),
    validateSession: makeValidateSession({
      ...common,
      sessions: infra.sessions,
    }),
    revokeSession: makeRevokeSession({ ...common, sessions: infra.sessions }),
    requestPasswordReset: makeRequestPasswordReset({
      ...common,
      authTokens: infra.authTokens,
    }),
    checkPasswordResetToken: makeCheckPasswordResetToken({
      ...common,
      authTokens: infra.authTokens,
    }),
    resetPassword: makeResetPassword({
      ...common,
      resets: infra.passwordResets,
      passwordHasher: infra.passwordHasher,
    }),
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

export const startLogin: UseCases["startLogin"] = (...args) =>
  getAuthUseCases().startLogin(...args)

export const getLoginChallenge: UseCases["getLoginChallenge"] = (...args) =>
  getAuthUseCases().getLoginChallenge(...args)

export const resendLoginCode: UseCases["resendLoginCode"] = (...args) =>
  getAuthUseCases().resendLoginCode(...args)

export const verifyLoginCode: UseCases["verifyLoginCode"] = (...args) =>
  getAuthUseCases().verifyLoginCode(...args)

export const redeemLoginGrant: UseCases["redeemLoginGrant"] = (...args) =>
  getAuthUseCases().redeemLoginGrant(...args)

export const validateSession: UseCases["validateSession"] = (...args) =>
  getAuthUseCases().validateSession(...args)

export const revokeSession: UseCases["revokeSession"] = (...args) =>
  getAuthUseCases().revokeSession(...args)

export const requestPasswordReset: UseCases["requestPasswordReset"] = (
  ...args
) => getAuthUseCases().requestPasswordReset(...args)

export const checkPasswordResetToken: UseCases["checkPasswordResetToken"] = (
  ...args
) => getAuthUseCases().checkPasswordResetToken(...args)

export const resetPassword: UseCases["resetPassword"] = (...args) =>
  getAuthUseCases().resetPassword(...args)

// --- Company users (tenant-scoped) ----------------------------------------------

function createUserUseCases() {
  const infra = getAuthInfrastructure()
  return {
    companyUsers: makeCompanyUsers({
      companyUsers: new PrismaCompanyUsersRepository(),
      tokenService: infra.tokenService,
      rateLimiter: infra.rateLimiter,
      notifier: infra.authNotifier,
      events: infra.authEventLog,
      clock: infra.clock,
    }),
    invitationAcceptance: makeInvitationAcceptance({
      acceptances: new PrismaInvitationAcceptanceStore(getPrisma()),
      passwordHasher: infra.passwordHasher,
      tokenService: infra.tokenService,
      events: infra.authEventLog,
      clock: infra.clock,
    }),
  }
}

let userUseCases: ReturnType<typeof createUserUseCases> | undefined

function getUserUseCases() {
  userUseCases ??= createUserUseCases()
  return userUseCases
}

type CompanyUsersApi = ReturnType<typeof createUserUseCases>["companyUsers"]
type InvitationApi = ReturnType<
  typeof createUserUseCases
>["invitationAcceptance"]

export const companyUsers: CompanyUsersApi = {
  overview: (...args) => getUserUseCases().companyUsers.overview(...args),
  invite: (...args) => getUserUseCases().companyUsers.invite(...args),
  revokeInvitation: (...args) =>
    getUserUseCases().companyUsers.revokeInvitation(...args),
  changeRole: (...args) => getUserUseCases().companyUsers.changeRole(...args),
  setActive: (...args) => getUserUseCases().companyUsers.setActive(...args),
}

export const invitationAcceptance: InvitationApi = {
  find: (...args) => getUserUseCases().invitationAcceptance.find(...args),
  accept: (...args) => getUserUseCases().invitationAcceptance.accept(...args),
}
