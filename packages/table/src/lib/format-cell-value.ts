import type { Locale } from "date-fns"

import { formatDateWith, parseDate } from "./format"

// Turning a value into the string a reader sees. One module, because a date is displayed in two
// places that must agree — a typed column's cell and the filter chip that narrowed it.

/** Which of the two configured formats a value is written in. */
export type DateValueKind = "date" | "datetime"

/** The date settings in effect, from `useTableLocale()`. */
export interface DateFormatSettings {
  locale?: Locale
  dateFormat: string
  dateTimeFormat: string
}

/**
 * A date or datetime value, written in the configured format.
 *
 * A string that will not parse comes back verbatim rather than blank: whatever the backend sent is
 * more use on screen than nothing, and it says where to look.
 */
export function formatDateValue(
  value: unknown,
  settings: DateFormatSettings,
  kind: DateValueKind
): string {
  const parsed = parseDate(value)
  if (parsed === null) return typeof value === "string" ? value : ""

  const pattern =
    kind === "datetime" ? settings.dateTimeFormat : settings.dateFormat
  return formatDateWith(parsed, pattern, settings.locale)
}
