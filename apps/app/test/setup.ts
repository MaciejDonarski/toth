import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
  cleanup()
})

// --- jsdom polyfills needed by Base UI components from @toth/ui ---
// (subset of packages/ui/test/setup.ts)

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??=
  ResizeObserverMock as unknown as typeof ResizeObserver

// Files that opt into `@vitest-environment node` have no DOM.
const hasDom = typeof window !== "undefined"

if (hasDom && !window.matchMedia) {
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

if (hasDom) {
  Element.prototype.scrollIntoView ??= vi.fn()
  Element.prototype.hasPointerCapture ??= vi.fn(() => false)
  Element.prototype.setPointerCapture ??= vi.fn()
  Element.prototype.releasePointerCapture ??= vi.fn()
  // input-otp (InputOTP) probes the caret position.
  document.elementFromPoint ??= () => null
}
