import { formatDuration, renderMail, type RenderedMail } from "./layout"

const NOT_YOU = "Jeśli to nie Ty, zignoruj tę wiadomość."

export function loginCodeMail(code: string, validForMs: number): RenderedMail {
  return renderMail("Kod logowania", [
    { kind: "p", text: "Twój kod do zalogowania:" },
    { kind: "code", text: code },
    { kind: "p", text: `Kod jest ważny przez ${formatDuration(validForMs)}.` },
    { kind: "muted", text: `Nikomu go nie podawaj. ${NOT_YOU}` },
  ])
}

export function emailVerificationMail(
  url: string,
  validForMs: number
): RenderedMail {
  return renderMail("Potwierdź adres email", [
    {
      kind: "p",
      text: "Dziękujemy za rejestrację. Potwierdź adres email, aby aktywować konto.",
    },
    { kind: "button", label: "Potwierdź email", href: url },
    {
      kind: "muted",
      text: `Link jest ważny przez ${formatDuration(validForMs)}. ${NOT_YOU}`,
    },
  ])
}

export function registrationAttemptMail(
  loginUrl: string,
  resetUrl: string
): RenderedMail {
  return renderMail("Próba rejestracji na Twój adres", [
    {
      kind: "p",
      text: "Ktoś próbował założyć nowe konto na ten adres email, ale konto już istnieje.",
    },
    { kind: "button", label: "Zaloguj się", href: loginUrl },
    { kind: "p", text: "Nie pamiętasz hasła? Możesz je zresetować:" },
    { kind: "button", label: "Zresetuj hasło", href: resetUrl },
    { kind: "muted", text: NOT_YOU },
  ])
}

export function passwordResetMail(
  url: string,
  validForMs: number
): RenderedMail {
  return renderMail("Reset hasła", [
    {
      kind: "p",
      text: "Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.",
    },
    { kind: "button", label: "Ustaw nowe hasło", href: url },
    {
      kind: "muted",
      text: `Link jest ważny przez ${formatDuration(validForMs)} i działa tylko raz. ${NOT_YOU} Twoje hasło pozostanie bez zmian.`,
    },
  ])
}

export function passwordChangedMail(resetUrl: string): RenderedMail {
  return renderMail("Hasło zostało zmienione", [
    {
      kind: "p",
      text: "Hasło do Twojego konta zostało właśnie zmienione. Wszystkie sesje i zapamiętane przeglądarki zostały wylogowane.",
    },
    { kind: "muted", text: "Jeśli to nie Ty, natychmiast zresetuj hasło:" },
    { kind: "button", label: "Zresetuj hasło", href: resetUrl },
  ])
}

export function accountLockedMail(
  lockedForMs: number,
  resetUrl: string
): RenderedMail {
  return renderMail("Wykryto nieudane próby logowania", [
    {
      kind: "p",
      text: `Z powodu wielu nieudanych prób logowania konto zostało tymczasowo zablokowane na ${formatDuration(lockedForMs)}.`,
    },
    { kind: "p", text: "Jeśli to nie Ty, zalecamy zmianę hasła:" },
    { kind: "button", label: "Zresetuj hasło", href: resetUrl },
  ])
}

export function invitationMail(
  url: string,
  companyName: string,
  validForMs: number
): RenderedMail {
  return renderMail(`Zaproszenie do ${companyName}`, [
    {
      kind: "p",
      text: `Zostałeś zaproszony do firmy ${companyName}. Ustaw hasło, aby aktywować konto.`,
    },
    { kind: "button", label: "Przyjmij zaproszenie", href: url },
    {
      kind: "muted",
      text: `Zaproszenie jest ważne przez ${formatDuration(validForMs)}. ${NOT_YOU}`,
    },
  ])
}
