import { startOfToday, subDays, subMonths, subWeeks } from "date-fns"

import type { DatePreset, DateRangePreset } from "../types"

/**
 * Built-in shortcuts for `type="date"`, relative to today (local midnight).
 * Labels come from `FormMessages.datePresets`.
 */
export const DATE_PRESETS: DatePreset[] = [
  { labelKey: "yesterday", value: () => subDays(startOfToday(), 1) },
  { labelKey: "daysAgo3", value: () => subDays(startOfToday(), 3) },
  { labelKey: "weekAgo", value: () => subWeeks(startOfToday(), 1) },
  { labelKey: "monthAgo", value: () => subMonths(startOfToday(), 1) },
]

/** The last `days` days, today included. */
function lastDays(days: number) {
  const to = startOfToday()
  return { from: subDays(to, days - 1), to }
}

/**
 * Built-in rolling shortcuts for `type="date-range"`, ending today.
 * Labels come from `FormMessages.rangePresets`.
 */
export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { labelKey: "today", value: () => lastDays(1) },
  {
    labelKey: "yesterday",
    value: () => {
      const day = subDays(startOfToday(), 1)
      return { from: day, to: day }
    },
  },
  { labelKey: "last3Days", value: () => lastDays(3) },
  { labelKey: "last7Days", value: () => lastDays(7) },
  { labelKey: "last30Days", value: () => lastDays(30) },
]
