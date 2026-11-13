// Full metadata: the default "min" set accepts too-short numbers.
import { parsePhoneNumberFromString } from "libphonenumber-js/max"

/**
 * Domain: a user's own profile data — phone and weekly working hours.
 */

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const
export type Weekday = (typeof WEEKDAYS)[number]

export const MINUTES_PER_DAY = 1440

/** Wall-clock minutes since midnight; `end` may be 1440 ("24:00"). */
export type TimeRange = Readonly<{ start: number; end: number }>

/** One range per working day; a missing day is a day off. */
export type WeeklySchedule = Readonly<Partial<Record<Weekday, TimeRange>>>

/** Same rule as the DB CHECK constraint: within one day, start before end. */
export function isValidRange({ start, end }: TimeRange): boolean {
  return (
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    start < end &&
    end <= MINUTES_PER_DAY
  )
}

/** `"08:30"` → 510; `"24:00"` → 1440; anything else → null. */
export function parseTime(value: string): number | null {
  const match = /^([01]\d|2[0-4]):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes <= MINUTES_PER_DAY ? minutes : null
}

/** 510 → `"08:30"`. */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

const DEFAULT_PHONE_COUNTRY = "PL"

/**
 * Validates a phone number and returns it in E.164 (`+48600100200`).
 * National numbers are read as Polish; foreign ones need their `+` prefix.
 * Returns null for anything that is not a valid number.
 */
export function normalizePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), DEFAULT_PHONE_COUNTRY)
  return parsed?.isValid() ? parsed.number : null
}

/** `+48600100200` → `+48 600 100 200`. */
export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164
}
