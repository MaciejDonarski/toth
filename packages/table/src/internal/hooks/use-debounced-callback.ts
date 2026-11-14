import * as React from "react"

/** What {@link useDebouncedCallback} hands back. Stable across renders. */
type DebouncedCallback<A extends unknown[]> = {
  /** Schedule the callback, replacing whatever was already pending. */
  call: (...args: A) => void
  /** Fire the pending call now, if there is one, and clear it. */
  flush: () => void
  /** Drop the pending call without firing it. */
  cancel: () => void
}

/**
 * A trailing debounce whose identity never changes.
 *
 * ```tsx
 * const commit = useDebouncedCallback(onValueChange, 300);
 * commit.call(next);        // N calls in a burst → one call, with the last value
 * commit.flush();           // ...unless something ends the interaction first
 * ```
 *
 * Three properties, and each one is a bug in the obvious
 * `useCallback(debounce(fn, delay), [fn])` spelling this replaces:
 *
 * 1. **The callback lives in a ref**, refreshed on every render. A caller passing an inline
 *    arrow gets a new function on every one of its own renders; rebuilding the debounce around
 *    it would throw away whatever call was pending, which is how the last of a burst of clicks
 *    goes missing.
 * 2. **One timer, trailing only.** `call` replaces the pending arguments and restarts the
 *    timer, so a burst leaves exactly one scheduled call holding the latest value — never two
 *    racing each other.
 * 3. **`flush` fires and clears.** The timer can therefore not fire the same value again
 *    afterwards, and a `flush` with nothing pending does nothing at all — which is what makes
 *    repeated Enter presses a no-op rather than a second call.
 *
 * `delay <= 0` calls through synchronously, so a caller can switch debouncing off with a
 * number instead of a branch.
 *
 * Unmounting **cancels** rather than flushes: firing a parent's setter from a teardown writes
 * into a tree that may already be gone. Anything that has to survive teardown should be
 * flushed on the event that ends the interaction — blur, Enter, submit.
 */
function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number
): DebouncedCallback<A> {
  const callbackRef = React.useRef(callback)
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const argsRef = React.useRef<A>(undefined)

  // `delay` goes through a ref as well, so changing it mid-flight neither restarts the pending
  // timer nor rebuilds the three functions below.
  const delayRef = React.useRef(delay)

  // No dependency array: both refs are refreshed after every render, which is early enough for
  // anything that can call them. A pending timer and a user event both run after the commit, so
  // neither can reach a ref this effect has not caught up with yet.
  React.useEffect(() => {
    callbackRef.current = callback
    delayRef.current = delay
  })

  const cancel = React.useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = undefined
    argsRef.current = undefined
  }, [])

  const flush = React.useCallback(() => {
    const args = argsRef.current
    if (!args) {
      return
    }

    cancel()
    callbackRef.current(...args)
  }, [cancel])

  const call = React.useCallback(
    (...args: A) => {
      if (delayRef.current <= 0) {
        cancel()
        callbackRef.current(...args)

        return
      }

      clearTimeout(timerRef.current)
      argsRef.current = args
      timerRef.current = setTimeout(flush, delayRef.current)
    },
    [cancel, flush]
  )

  React.useEffect(() => cancel, [cancel])

  return React.useMemo(() => ({ call, flush, cancel }), [call, flush, cancel])
}

export { useDebouncedCallback }
export type { DebouncedCallback }
