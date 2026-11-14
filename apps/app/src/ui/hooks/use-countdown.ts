"use client"

import { useEffect, useState } from "react"

/**
 * Milliseconds left until `target` (0 once passed, or when `target` is null).
 * The clock ticks every second while a target is set, and refreshes as soon
 * as the tab becomes visible again (background timers are throttled).
 */
export function useCountdown(target: Date | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const tick = () => setNow(Date.now())
    // `now` may be stale when a new target arrives; refresh right away.
    const immediate = setTimeout(tick, 0)
    const interval = setInterval(tick, 1_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearTimeout(immediate)
      clearInterval(interval)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [target])

  return target ? Math.max(0, target.getTime() - now) : 0
}

/** `125_000` → `"2:05"`. Rounds up, so "0:00" means truly expired. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
