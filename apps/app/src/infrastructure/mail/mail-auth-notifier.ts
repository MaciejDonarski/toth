import type { AuthNotifier } from "@/core/auth/application/ports/auth-notifier"
import type { Mailer } from "@/core/notifications/application/ports/mailer"

import { DEFAULT_LOCALE, type AppLocale } from "@/i18n/config"

import { authTemplates } from "./templates/auth-templates"
import type { RenderedMail } from "./templates/layout"

/**
 * Builds absolute links from `appUrl` and sends auth emails. Texts come from
 * the message catalog in `locale` (a per-user language can be passed here
 * once users have one).
 */
export class MailAuthNotifier implements AuthNotifier {
  readonly #mail: ReturnType<typeof authTemplates>

  constructor(
    private readonly mailer: Mailer,
    private readonly appUrl: string,
    locale: AppLocale = DEFAULT_LOCALE
  ) {
    this.#mail = authTemplates(locale)
  }

  sendLoginCode(
    to: string,
    { code, validForMs }: { code: string; validForMs: number }
  ) {
    return this.#send(to, this.#mail.loginCode(code, validForMs))
  }

  sendEmailVerification(
    to: string,
    { token, validForMs }: { token: string; validForMs: number }
  ) {
    return this.#send(
      to,
      this.#mail.emailVerification(
        this.#url("/verify-email", token),
        validForMs
      )
    )
  }

  sendRegistrationAttempt(to: string) {
    return this.#send(
      to,
      this.#mail.registrationAttempt(
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
      this.#mail.passwordReset(this.#url("/reset-password", token), validForMs)
    )
  }

  sendPasswordChanged(to: string) {
    return this.#send(
      to,
      this.#mail.passwordChanged(this.#url("/forgot-password"))
    )
  }

  sendAccountLocked(to: string, { lockedForMs }: { lockedForMs: number }) {
    return this.#send(
      to,
      this.#mail.accountLocked(lockedForMs, this.#url("/forgot-password"))
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
      this.#mail.invitation(
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
