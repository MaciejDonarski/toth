/** Supported UI languages. Add a locale here and a `messages/<locale>.json`. */
export const LOCALES = ["pl"] as const

export type AppLocale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = "pl"

/** Cookie holding the chosen language (no locale prefix in URLs). */
export const LOCALE_COOKIE = "locale"

/** Wall-clock times (working hours, dates) are shown in this zone. */
export const TIME_ZONE = "Europe/Warsaw"

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  )
}
