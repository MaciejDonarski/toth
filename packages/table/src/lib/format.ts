import { format as formatDate, isValid, parseISO, type Locale } from "date-fns"

// Dates and numbers as the table reads and writes them. date-fns, no timezone handling: a value
// is an ISO string (an offset is honoured, none means local time), a `Date` or a timestamp.

/** A cell or filter value as a `Date`, or `null` when it is not one. */
export function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null
  if (typeof value === "number") {
    return Number.isFinite(value) ? new Date(value) : null
  }
  if (typeof value !== "string" || value.trim() === "") return null
  const parsed = parseISO(value.trim())
  return isValid(parsed) ? parsed : null
}

/** A date written with a date-fns pattern; `""` for an invalid one. */
export function formatDateWith(
  date: Date,
  pattern: string,
  locale?: Locale
): string {
  return isValid(date) ? formatDate(date, pattern, { locale }) : ""
}

/** The BCP 47 tag of a date-fns locale, for `Intl` — `undefined` lets the runtime choose. */
export function localeTag(locale?: Locale): string | undefined {
  return locale?.code
}

/** A number in the locale's own grouping and decimal marks. */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale?: Locale
): string {
  return new Intl.NumberFormat(localeTag(locale), options).format(value)
}
