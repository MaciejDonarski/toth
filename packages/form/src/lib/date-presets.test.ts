import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DATE_PRESETS, DATE_RANGE_PRESETS } from "./date-presets"

const day = (d: number, m = 2) => new Date(2024, m, d)

describe("date presets", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2024, 2, 15, 14, 30))
  })
  afterEach(() => vi.useRealTimers())

  it("DATE_PRESETS are relative to today at midnight", () => {
    expect(DATE_PRESETS.map((p) => [p.labelKey, p.value()])).toEqual([
      ["yesterday", day(14)],
      ["daysAgo3", day(12)],
      ["weekAgo", day(8)],
      ["monthAgo", day(15, 1)],
    ])
  })

  it("DATE_RANGE_PRESETS are rolling ranges ending today", () => {
    expect(DATE_RANGE_PRESETS.map((p) => [p.labelKey, p.value()])).toEqual([
      ["today", { from: day(15), to: day(15) }],
      ["yesterday", { from: day(14), to: day(14) }],
      ["last3Days", { from: day(13), to: day(15) }],
      ["last7Days", { from: day(9), to: day(15) }],
      ["last30Days", { from: day(15, 1), to: day(15) }],
    ])
  })
})
