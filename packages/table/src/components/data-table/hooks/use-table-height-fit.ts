import * as React from "react"

/**
 * How far down the viewport the table starts, in pixels.
 *
 * That one number is all JavaScript contributes to filling the window: the stylesheet works out
 * the height from it with `calc(100dvh - …)`, so the minimum height, the room left below the table
 * and the behaviour on a phone's collapsing address bar are all expressed in CSS where they can be
 * overridden. The old hook measured the window too and assigned `style.maxHeight` directly, which
 * put four magic numbers in a JavaScript file and left a consumer nothing to override.
 *
 * Measurement is coalesced into an animation frame because a `ResizeObserver` callback that writes
 * state which changes layout is how you get "ResizeObserver loop completed with undelivered
 * notifications" in the console.
 */
export function useTableHeightFit(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean
): number {
  const [offsetTop, setOffsetTop] = React.useState(0)

  React.useEffect(() => {
    const element = ref.current

    if (!enabled || !element) {
      return undefined
    }

    let frame: number | null = null

    const measure = () => {
      if (frame !== null) cancelAnimationFrame(frame)

      frame = requestAnimationFrame(() => {
        frame = null
        // Rounded up: a fractional offset turns into a fractional max-height, and a
        // scroll container one subpixel too tall never settles.
        //
        // Clamped at zero because the offset is only ever subtracted from the window
        // height. A negative one — the table's top scrolled above the viewport — would
        // ADD to the budget, showing more rows, making the page taller, allowing more
        // scroll: a loop. Zero is the right ceiling, and it means the whole window.
        setOffsetTop(
          Math.max(0, Math.ceil(element.getBoundingClientRect().top))
        )
      })
    }

    measure()

    // The element's own box moving or resizing covers a toolbar wrapping onto a second line;
    // the window listeners cover everything above the table changing without the table doing
    // anything — a banner appearing, the page scrolling.
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, { passive: true })

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)

      observer.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure)
    }
  }, [ref, enabled])

  return offsetTop
}
