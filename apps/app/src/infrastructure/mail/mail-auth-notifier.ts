import type { AuthNotifier } from "@/core/auth/application/ports/auth-notifier"
import type { Mailer } from "@/core/notifications/application/ports/mailer"

import {
  accountLockedMail,
  emailVerificationMail,
  invitationMail,
  loginCodeMail,
  passwordChangedMail,
  passwordResetMail,
  registrationAttemptMail,
} from "./templates/auth-templates"
import type { RenderedMail } from "./templates/layout"

/** Builds absolute links from `appUrl` and sends Polish auth emails. */
export class MailAuthNotifier implements AuthNotifier {
  constructor(
    private readonly mailer: Mailer,
    private readonly appUrl: string
  ) {}

  sendLoginCode(
    to: string,
    { code, validForMs }: { code: string; validForMs: number }
  ) {
    return this.#send(to, loginCodeMail(code, validForMs))
  }

  sendEmailVerification(
    to: string,
    { token, validForMs }: { token: string; validForMs: number }
  ) {
    return this.#send(
      to,
      emailVerificationMail(this.#url("/verify-email", token), validForMs)
    )
  }

  sendRegistrationAttempt(to: string) {
    return this.#send(
      to,
      registrationAttemptMail(
        this.#url("/login"),
        this.#url("/forgot-password")
      )
    )
  }

  sendPasswordReset(
    to: string,
    { token, validForMs }: { token: string; validForMs: number }
  ) {
    return this.#send(
      to,
      passwordResetMail(this.#url("/reset-password", token), validForMs)
    )
  }

  sendPasswordChanged(to: string) {
    return this.#send(to, passwordChangedMail(this.#url("/forgot-password")))
  }

  sendAccountLocked(to: string, { lockedForMs }: { lockedForMs: number }) {
    return this.#send(
      to,
      accountLockedMail(lockedForMs, this.#url("/forgot-password"))
    )
  }

  sendInvitation(
    to: string,
    {
      token,
      companyName,
      validForMs,
    }: { token: string; companyName: string; validForMs: number }
  ) {
    return this.#send(
      to,
      invitationMail(
        this.#url("/accept-invite", token),
        companyName,
        validForMs
      )
    )
  }

  #url(path: string, token?: string): string {
    const url = new URL(path, this.appUrl)
    if (token) url.searchParams.set("token", token)
    return url.toString()
  }

  #send(to: string, mail: RenderedMail): Promise<void> {
    return this.mailer.send({ to, ...mail })
  }
}
