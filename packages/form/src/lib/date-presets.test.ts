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
    expect(DATE_PRESETS.map((p) => [p.label, p.value()])).toEqual([
      ["Yesterday", day(14)],
      ["3 days ago", day(12)],
      ["Week ago", day(8)],
      ["Month ago", day(15, 1)],
    ])
  })

  it("DATE_RANGE_PRESETS are rolling ranges ending today", () => {
    expect(DATE_RANGE_PRESETS.map((p) => [p.label, p.value()])).toEqual([
      ["Today", { from: day(15), to: day(15) }],
      ["Yesterday", { from: day(14), to: day(14) }],
      ["Last 3 days", { from: day(13), to: day(15) }],
      ["Last 7 days", { from: day(9), to: day(15) }],
      ["Last 30 days", { from: day(15, 1), to: day(15) }],
    ])
  })
})
