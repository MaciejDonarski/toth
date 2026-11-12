/** Keys of the built-in `DATE_PRESETS`, translated via `FormMessages.datePresets`. */
export type DatePresetKey = "yesterday" | "daysAgo3" | "weekAgo" | "monthAgo"

/** Keys of the built-in `DATE_RANGE_PRESETS`, translated via `FormMessages.rangePresets`. */
export type DateRangePresetKey =
  "today" | "yesterday" | "last3Days" | "last7Days" | "last30Days"

/** Every user-facing string rendered by @toth/form. */
export interface FormMessages {
  /** Placeholder of a `date` field without its own `placeholder`. */
  pickDate: string
  /** Placeholder of a `date-range` field without its own `placeholder`. */
  pickDateRange: string
  /** Select/multiselect search with no match, unless the item sets `emptyText`. */
  noResults: string
  from: string
  to: string
  clearFrom: string
  clearTo: string
  /** Accessible name of the preset button group. */
  presets: string
  datePresets: Record<DatePresetKey, string>
  rangePresets: Record<DateRangePresetKey, string>
}

/** `FormMessages` where every key (nested ones too) is optional. */
export type FormMessagesInput = Partial<
  Omit<FormMessages, "datePresets" | "rangePresets">
> & {
  datePresets?: Partial<FormMessages["datePresets"]>
  rangePresets?: Partial<FormMessages["rangePresets"]>
}

export const enMessages: FormMessages = {
  pickDate: "Pick a date",
  pickDateRange: "Pick a date range",
  noResults: "No results.",
  from: "From",
  to: "To",
  clearFrom: "Clear from",
  clearTo: "Clear to",
  presets: "Presets",
  datePresets: {
    yesterday: "Yesterday",
    daysAgo3: "3 days ago",
    weekAgo: "Week ago",
    monthAgo: "Month ago",
  },
  rangePresets: {
    today: "Today",
    yesterday: "Yesterday",
    last3Days: "Last 3 days",
    last7Days: "Last 7 days",
    last30Days: "Last 30 days",
  },
}

export const plMessages: FormMessages = {
  pickDate: "Wybierz datę",
  pickDateRange: "Wybierz zakres dat",
  noResults: "Brak wyników.",
  from: "Od",
  to: "Do",
  clearFrom: "Wyczyść datę od",
  clearTo: "Wyczyść datę do",
  presets: "Szybki wybór",
  datePresets: {
    yesterday: "Wczoraj",
    daysAgo3: "3 dni temu",
    weekAgo: "Tydzień temu",
    monthAgo: "Miesiąc temu",
  },
  rangePresets: {
    today: "Dziś",
    yesterday: "Wczoraj",
    last3Days: "Ostatnie 3 dni",
    last7Days: "Ostatnie 7 dni",
    last30Days: "Ostatnie 30 dni",
  },
}

/** Shallow-merges message sets left to right; preset maps are merged per key. */
export function mergeMessages(
  ...parts: (FormMessagesInput | undefined)[]
): FormMessagesInput {
  let out: FormMessagesInput = {}
  for (const part of parts) {
    if (!part) continue
    out = {
      ...out,
      ...part,
      datePresets: { ...out.datePresets, ...part.datePresets },
      rangePresets: { ...out.rangePresets, ...part.rangePresets },
    }
  }
  return out
}
