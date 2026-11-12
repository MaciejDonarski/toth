import { startOfToday, subDays, subMonths, subWeeks } from "date-fns"

import type { DatePreset, DateRangePreset } from "../types"

/**
 * Built-in shortcuts for `type="date"`, relative to today (local midnight).
 */
export const DATE_PRESETS: DatePreset[] = [
  { label: "Yesterday", value: () => subDays(startOfToday(), 1) },
  { label: "3 days ago", value: () => subDays(startOfToday(), 3) },
  { label: "Week ago", value: () => subWeeks(startOfToday(), 1) },
  { label: "Month ago", value: () => subMonths(startOfToday(), 1) },
]

/** The last `days` days, today included. */
function lastDays(days: number) {
  const to = startOfToday()
  return { from: subDays(to, days - 1), to }
}

/**
 * Built-in rolling shortcuts for `type="date-range"`, ending today.
 */
export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { label: "Today", value: () => lastDays(1) },
  {
    label: "Yesterday",
    value: () => {
      const day = subDays(startOfToday(), 1)
      return { from: day, to: day }
    },
  },
  { label: "Last 3 days", value: () => lastDays(3) },
  { label: "Last 7 days", value: () => lastDays(7) },
  { label: "Last 30 days", value: () => lastDays(30) },
]
