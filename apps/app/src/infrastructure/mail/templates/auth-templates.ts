import { createTranslator } from "next-intl"

import type { AppLocale } from "@/i18n/config"
import { MESSAGES } from "@/i18n/messages"

import { renderMail, type RenderedMail } from "./layout"

/** Translator for the `mail` namespace of the message catalog. */
export function mailTranslator(locale: AppLocale) {
  return createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "mail",
  })
}

export type MailTranslator = ReturnType<typeof mailTranslator>

/** 180 000 → "3 minuty", 86 400 000 → "24 godziny", 3 days → "3 dni". */
export function formatDuration(t: MailTranslator, ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return t("duration.minutes", { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 48) return t("duration.hours", { count: hours })
  return t("duration.days", { count: Math.round(hours / 24) })
}

/** Builds the auth emails in one language. All texts come from `mail.*`. */
export function authTemplates(locale: AppLocale) {
  const t = mailTranslator(locale)
  const render = (subject: string, blocks: Parameters<typeof renderMail>[2]) =>
    renderMail(locale, subject, blocks)
  const duration = (ms: number) => formatDuration(t, ms)

  return {
    loginCode(code: string, validForMs: number): RenderedMail {
      return render(t("loginCode.subject"), [
        { kind: "p", text: t("loginCode.intro") },
        { kind: "code", text: code },
        {
          kind: "p",
          text: t("loginCode.validity", { duration: duration(validForMs) }),
        },
        { kind: "muted", text: `${t("loginCode.warning")} ${t("notYou")}` },
      ])
    },

    emailVerification(url: string, validForMs: number): RenderedMail {
      return render(t("emailVerification.subject"), [
        { kind: "p", text: t("emailVerification.intro") },
        { kind: "button", label: t("emailVerification.button"), href: url },
        {
          kind: "muted",
          text: `${t("emailVerification.validity", { duration: duration(validForMs) })} ${t("notYou")}`,
        },
      ])
    },

    registrationAttempt(loginUrl: string, resetUrl: string): RenderedMail {
      return render(t("registrationAttempt.subject"), [
        { kind: "p", text: t("registrationAttempt.intro") },
        {
          kind: "button",
          label: t("registrationAttempt.login"),
          href: loginUrl,
        },
        { kind: "p", text: t("registrationAttempt.forgot") },
        {
          kind: "button",
          label: t("registrationAttempt.reset"),
          href: resetUrl,
        },
        { kind: "muted", text: t("notYou") },
      ])
    },

    passwordReset(url: string, validForMs: number): RenderedMail {
      return render(t("passwordReset.subject"), [
        { kind: "p", text: t("passwordReset.intro") },
        { kind: "button", label: t("passwordReset.button"), href: url },
        {
          kind: "muted",
          text: `${t("passwordReset.validity", { duration: duration(validForMs) })} ${t("notYou")} ${t("passwordReset.unchanged")}`,
        },
      ])
    },

    passwordChanged(resetUrl: string): RenderedMail {
      return render(t("passwordChanged.subject"), [
        { kind: "p", text: t("passwordChanged.intro") },
        { kind: "muted", text: t("passwordChanged.notYou") },
        { kind: "button", label: t("passwordChanged.reset"), href: resetUrl },
      ])
    },

    accountLocked(lockedForMs: number, resetUrl: string): RenderedMail {
      return render(t("accountLocked.subject"), [
        {
          kind: "p",
          text: t("accountLocked.intro", { duration: duration(lockedForMs) }),
        },
        { kind: "p", text: t("accountLocked.advice") },
        { kind: "button", label: t("accountLocked.reset"), href: resetUrl },
      ])
    },

    invitation(url: string, company: string, validForMs: number): RenderedMail {
      return render(t("invitation.subject", { company }), [
        { kind: "p", text: t("invitation.intro", { company }) },
        { kind: "button", label: t("invitation.button"), href: url },
        {
          kind: "muted",
          text: `${t("invitation.validity", { duration: duration(validForMs) })} ${t("notYou")}`,
        },
      ])
    },

    invitationExistingAccount(company: string, loginUrl: string): RenderedMail {
      return render(t("invitationExistingAccount.subject", { company }), [
        { kind: "p", text: t("invitationExistingAccount.intro", { company }) },
        { kind: "p", text: t("invitationExistingAccount.explain") },
        {
          kind: "button",
          label: t("invitationExistingAccount.login"),
          href: loginUrl,
        },
        { kind: "muted", text: t("notYou") },
      ])
    },
  }
}
