import { act, renderHook } from "@testing-library/react"
import { sizeStepFor, useSizeStep } from "./use-size-step"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const STEPS = { sm: 0, md: 640, lg: 960 }

// jsdom has neither layout nor `ResizeObserver`, so both are stood in for: the element reports
// whatever width the test sets, and the observer hands the test its callback to fire.
let observed: (() => void) | null = null
let width = 0

class FakeResizeObserver {
  constructor(callback: () => void) {
    observed = callback
  }

  observe() {}

  disconnect() {
    observed = null
  }
}

function setup(initialWidth: number) {
  width = initialWidth
  const element = document.createElement("div")
  element.getBoundingClientRect = () => ({ width }) as DOMRect

  return renderHook(() => useSizeStep(React.useRef(element), STEPS))
}

function resizeTo(next: number) {
  width = next
  act(() => {
    observed?.()
    vi.runAllTimers()
  })
}

describe("sizeStepFor", () => {
  it("picks the largest step the width reaches", () => {
    expect(sizeStepFor(360, STEPS)).toBe("sm")
    expect(sizeStepFor(639, STEPS)).toBe("sm")
    expect(sizeStepFor(640, STEPS)).toBe("md")
    expect(sizeStepFor(734, STEPS)).toBe("md")
    expect(sizeStepFor(990, STEPS)).toBe("lg")
  })

  it("does not depend on the order the steps are written in", () => {
    expect(sizeStepFor(700, { lg: 960, sm: 0, md: 640 })).toBe("md")
  })
})

describe("useSizeStep", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("ResizeObserver", FakeResizeObserver)
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) =>
      setTimeout(() => fn(0), 0)
    )
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.each([
    [360, "sm"],
    [734, "md"],
    [990, "lg"],
  ])("measures %ipx as %s on mount", (initial, expected) => {
    const { result } = setup(initial)

    expect(result.current).toBe(expected)
  })

  it("follows the element as it is resized", () => {
    const { result } = setup(990)

    resizeTo(734)
    expect(result.current).toBe("md")

    resizeTo(360)
    expect(result.current).toBe("sm")
  })

  // An element with no width has not been laid out, which says nothing about its size.
  it("keeps the widest step until the element has a width", () => {
    const { result } = setup(0)

    expect(result.current).toBe("lg")
  })

  it("disconnects on unmount", () => {
    const { unmount } = setup(500)

    unmount()
    expect(observed).toBeNull()
  })
})
