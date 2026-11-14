import { act, renderHook } from "@testing-library/react"
import { useDebouncedCallback } from "./use-debounced-callback"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("fires once, with the last arguments, after a burst", () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.call(1)
      result.current.call(2)
      result.current.call(3)
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => void vi.advanceTimersByTime(300))

    expect(callback).toHaveBeenCalledExactlyOnceWith(3)
  })

  // The bug this hook exists for: a caller passing an inline arrow re-renders with a new
  // function on every keystroke, and rebuilding the debounce around it drops what was pending.
  it("keeps the pending call across a change of callback", () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 300),
      { initialProps: { callback: first } }
    )

    act(() => result.current.call("value"))
    rerender({ callback: second })
    act(() => void vi.advanceTimersByTime(300))

    // Still exactly one call — and it reaches the callback that is current when it fires.
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledExactlyOnceWith("value")
  })

  it("flushes the pending call and does not fire it again", () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => result.current.call("now"))
    act(() => result.current.flush())

    expect(callback).toHaveBeenCalledExactlyOnceWith("now")

    act(() => void vi.advanceTimersByTime(300))

    expect(callback).toHaveBeenCalledOnce()
  })

  // What makes a second and third Enter press a no-op rather than a second call.
  it("does nothing when flushed with nothing pending", () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.flush()
      result.current.flush()
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it("drops the pending call when cancelled", () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => result.current.call("dropped"))
    act(() => result.current.cancel())
    act(() => void vi.advanceTimersByTime(300))

    expect(callback).not.toHaveBeenCalled()
  })

  it("calls through synchronously with a delay of zero", () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 0))

    act(() => result.current.call("immediate"))

    expect(callback).toHaveBeenCalledExactlyOnceWith("immediate")
  })

  // Cancels rather than flushes: firing a parent's setter from a teardown writes into a tree
  // that may already be gone. Blur and Enter are the flush points instead.
  it("cancels on unmount", () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback, 300)
    )

    act(() => result.current.call("lost"))
    unmount()
    act(() => void vi.advanceTimersByTime(300))

    expect(callback).not.toHaveBeenCalled()
  })

  it("keeps one identity across renders", () => {
    const { result, rerender } = renderHook(() =>
      useDebouncedCallback(() => {}, 300)
    )
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
