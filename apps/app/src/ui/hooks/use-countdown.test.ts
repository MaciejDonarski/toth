import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { formatCountdown, useCountdown } from "./use-countdown"

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-13T10:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("counts down to zero and stays there", () => {
    const target = new Date("2026-11-13T10:03:00Z")
    const { result } = renderHook(() => useCountdown(target))
    expect(result.current).toBe(180_000)

    act(() => vi.advanceTimersByTime(61_000))
    expect(result.current).toBe(119_000)

    act(() => vi.advanceTimersByTime(200_000))
    expect(result.current).toBe(0)
  })

  it("returns 0 without a target", () => {
    const { result } = renderHook(() => useCountdown(null))
    expect(result.current).toBe(0)
  })

  it("refreshes a stale clock when a new target arrives", () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: Date | null }) => useCountdown(target),
      { initialProps: { target: null as Date | null } }
    )
    vi.setSystemTime(new Date("2026-11-13T10:05:00Z"))
    rerender({ target: new Date("2026-11-13T10:06:00Z") })

    act(() => vi.advanceTimersByTime(0))
    expect(result.current).toBe(60_000)
  })
})

describe("formatCountdown", () => {
  it.each([
    [180_000, "3:00"],
    [125_000, "2:05"],
    [59_001, "1:00"],
    [400, "0:01"],
    [0, "0:00"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected)
  })
})
