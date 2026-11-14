import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
  cleanup()
})

// --- jsdom polyfills needed by Base UI, cmdk, embla, recharts, vaul-like drawers ---

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??=
  ResizeObserverMock as unknown as typeof ResizeObserver

class IntersectionObserverMock {
  readonly root = null
  readonly rootMargin = ""
  readonly thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver ??=
  IntersectionObserverMock as unknown as typeof IntersectionObserver

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

Element.prototype.scrollIntoView ??= vi.fn()
Element.prototype.hasPointerCapture ??= vi.fn(() => false)
Element.prototype.setPointerCapture ??= vi.fn()
Element.prototype.releasePointerCapture ??= vi.fn()

if (!document.elementFromPoint) {
  document.elementFromPoint = () => null
}

if (!globalThis.DOMRect) {
  globalThis.DOMRect = class {
    constructor(
      public x = 0,
      public y = 0,
      public width = 0,
      public height = 0
    ) {}
    get top() {
      return this.y
    }
    get left() {
      return this.x
    }
    get right() {
      return this.x + this.width
    }
    get bottom() {
      return this.y + this.height
    }
    toJSON() {
      return this
    }
    static fromRect(r?: DOMRectInit) {
      return new DOMRect(r?.x, r?.y, r?.width, r?.height)
    }
  } as unknown as typeof DOMRect
}
