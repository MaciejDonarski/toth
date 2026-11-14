import * as React from "react"

/** Named minimum widths, in px — `{ sm: 0, md: 640, lg: 960 }`. */
type SizeSteps<TStep extends string> = Readonly<Record<TStep, number>>

/** The step a width falls into: the one with the largest minimum the width still reaches. */
function sizeStepFor<TStep extends string>(
  width: number,
  steps: SizeSteps<TStep>
): TStep {
  const ordered = (Object.entries(steps) as [TStep, number][]).sort(
    (a, b) => a[1] - b[1]
  )
  let step = ordered[0]![0]

  for (const [name, min] of ordered) {
    if (width >= min) step = name
  }

  return step
}

/** The step with the largest minimum — what an element is assumed to be before it is measured. */
function widestStep<TStep extends string>(steps: SizeSteps<TStep>): TStep {
  return (Object.entries(steps) as [TStep, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0]![0]
}

// DECISION: unmeasured means widest, so jsdom tests and the first paint see the full layout.
/**
 * Which named width step an ELEMENT is in, kept current by a `ResizeObserver`.
 *
 * Media queries answer for the window, and a component inside a sidebar layout, a card or a split
 * view is not the window: the sidebar collapsing changes its width with the viewport standing still.
 * This measures the element itself and returns the key of the step it reaches, which the component
 * then writes out as an attribute (`data-size`) for its stylesheet to read.
 *
 * Deliberately not `container-type`: a size container is also a layout-contained box, and anything
 * `position: fixed` inside one is positioned against it instead of against the screen — which breaks
 * every full-screen panel and docked bar a component might open from inside it.
 *
 * Until the element has been measured — on the server, in a test environment without layout, or
 * before the first observation lands — the widest step is returned, so nothing collapses into its
 * narrow form only to spring back a frame later. Pass `fallback` to choose another.
 *
 * The step only changes when the width crosses a boundary, and the update is deferred to the next
 * animation frame: a state change that reflows the element it is observing would otherwise make the
 * observer fire inside its own callback, and the browser reports a "ResizeObserver loop".
 */
function useSizeStep<TStep extends string>(
  ref: React.RefObject<HTMLElement | null>,
  steps: SizeSteps<TStep>,
  fallback: TStep = widestStep(steps)
): TStep {
  const [step, setStep] = React.useState<TStep>(fallback)

  // Keyed on the content, so a caller passing a fresh literal every render does not reconnect the
  // observer every render.
  const stepsKey = JSON.stringify(steps)

  React.useLayoutEffect(() => {
    const element = ref.current
    const parsed = JSON.parse(stepsKey) as SizeSteps<TStep>

    if (!element || typeof ResizeObserver === "undefined") return undefined

    const measure = (width: number) => {
      // A box with no width has not been laid out (`display: none`, detached, jsdom) — that
      // says nothing about how wide it is, so the current step stands.
      if (width > 0) setStep(sizeStepFor(width, parsed))
    }

    measure(element.getBoundingClientRect().width)

    let frame = 0
    // Re-measured in the frame rather than read off the entry: `contentRect` leaves out the
    // padding and border the first measurement above includes, and the two must agree.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() =>
        measure(element.getBoundingClientRect().width)
      )
    })

    observer.observe(element)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [ref, stepsKey])

  return step
}

export { sizeStepFor, useSizeStep }
export type { SizeSteps }
